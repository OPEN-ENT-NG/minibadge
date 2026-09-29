package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.helper.LoggerHelper;
import fr.openent.minibadge.service.PdfExportService;
import fr.wseduc.webutils.collections.SharedDataHelper;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.Vertx;
import io.vertx.core.json.DecodeException;
import io.vertx.core.json.JsonObject;
import org.entcore.common.pdf.Pdf;
import org.entcore.common.pdf.PdfFactory;
import org.entcore.common.pdf.PdfGenerator;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.function.Function;

/**
 * Resolves the {@code node-pdf-generator} configuration exactly like {@code PdfFactory} does — the
 * module's own block when it is present (even empty), otherwise the platform's, read from the local
 * shared map {@code server} — and builds ONE {@code PdfFactory}, only when that configuration has a
 * non-empty {@code url} and {@code auth}.
 * <p>
 * The factory receives the module configuration only when it actually carries the block, {@code null}
 * otherwise: passing an empty block (as {@code form} does) would make {@code PdfFactory} prefer it over
 * a working platform configuration.
 * <p>
 * {@code NodePdfClient} only bounds the connection ({@code pdf-timeout}), never the answer: every generation
 * is therefore raced against a timer ({@code pdf-export-timeout}, in ms, default 60 s) so that a silent PDF
 * service can never leave a request open.
 */
public class DefaultPdfExportService implements PdfExportService {

    public static final String NODE_PDF_GENERATOR = "node-pdf-generator";
    public static final String URL = "url";
    public static final String AUTH = "auth";
    public static final String PDF_EXPORT_TIMEOUT = "pdf-export-timeout";
    public static final long DEFAULT_TIMEOUT_MS = 60000L;
    public static final String PDF_TIMEOUT_ERROR = "PDF generation timed out";
    private static final String SERVER_MAP = "server";

    private static final DefaultPdfExportService instance = new DefaultPdfExportService();

    private DefaultPdfExportService() {
    }

    public static DefaultPdfExportService getInstance() {
        return instance;
    }

    /** Null whenever the export is disabled. */
    private volatile PdfGenerator pdfGenerator;
    /** Runs the generation timer: none (no timeout) only in tests that configure without it. */
    private volatile Vertx vertx;
    private volatile long timeoutMs = DEFAULT_TIMEOUT_MS;

    /**
     * Startup: never fails (an unreadable platform configuration simply leaves the export disabled).
     *
     * @param vertx        vertx instance, given to the {@code PdfFactory}
     * @param moduleConfig this module's configuration
     */
    public Future<Void> init(Vertx vertx, JsonObject moduleConfig) {
        Future<Object> platformValue;
        try {
            platformValue = moduleBlock(moduleConfig) != null
                    ? Future.succeededFuture()
                    : SharedDataHelper.getInstance().<String, Object>getLocal(SERVER_MAP, NODE_PDF_GENERATOR);
        } catch (Exception e) {
            platformValue = Future.failedFuture(e);
        }
        return platformValue
                .recover(err -> {
                    LoggerHelper.logError(this, "init", "Fail to read the platform node-pdf-generator configuration",
                            String.valueOf(err.getMessage()));
                    return Future.succeededFuture();
                })
                .<Void>map(value -> {
                    configure(vertx, moduleConfig, value, factoryConfig -> new PdfFactory(vertx, factoryConfig).getPdfGenerator());
                    return null;
                })
                .recover(err -> {
                    LoggerHelper.logError(this, "init", "PDF export left disabled", String.valueOf(err.getMessage()));
                    return Future.succeededFuture();
                });
    }

    /**
     * Decides whether the export is enabled and, only then, builds the generator.
     *
     * @param moduleConfig  this module's configuration
     * @param platformValue the platform's {@code node-pdf-generator} value (JSON string or object), only read
     *                      when the module has no block of its own
     * @param factory       builds the generator from the configuration given to {@code PdfFactory}
     */
    public void configure(JsonObject moduleConfig, Object platformValue, Function<JsonObject, PdfGenerator> factory) {
        configure(null, moduleConfig, platformValue, factory);
    }

    /**
     * Same as {@link #configure(JsonObject, Object, Function)}, every generation being bounded by a timer.
     *
     * @param vertx runs the generation timer ({@code null}: generations are not bounded)
     */
    public void configure(Vertx vertx, JsonObject moduleConfig, Object platformValue,
                          Function<JsonObject, PdfGenerator> factory) {
        this.vertx = vertx;
        this.timeoutMs = timeout(moduleConfig);
        JsonObject moduleBlock = moduleBlock(moduleConfig);
        JsonObject resolved = moduleBlock != null ? moduleBlock : parse(platformValue);
        PdfGenerator generator = null;
        if (isConfigured(resolved)) {
            try {
                generator = factory.apply(moduleBlock != null ? moduleConfig : null);
            } catch (Exception e) {
                LoggerHelper.logError(this, "configure", "Fail to build the PDF generator", String.valueOf(e.getMessage()));
            }
        }
        this.pdfGenerator = generator;
        LoggerHelper.logInfo(this, "configure", String.format("PDF export %s (configuration from %s)",
                generator != null ? "enabled" : "disabled",
                moduleBlock != null ? "the module" : (resolved != null ? "the platform" : "nowhere")));
    }

    /** Same lookup as {@code PdfFactory}: the block wins as soon as it is a JSON object, even an empty one. */
    static JsonObject moduleBlock(JsonObject moduleConfig) {
        if (moduleConfig == null) return null;
        Object block = moduleConfig.getValue(NODE_PDF_GENERATOR);
        return block instanceof JsonObject ? (JsonObject) block : null;
    }

    static JsonObject parse(Object platformValue) {
        if (platformValue instanceof JsonObject) return (JsonObject) platformValue;
        if (platformValue instanceof String && !((String) platformValue).trim().isEmpty()) {
            try {
                return new JsonObject((String) platformValue);
            } catch (DecodeException | ClassCastException e) {
                return null;
            }
        }
        return null;
    }

    /** @return the {@code pdf-export-timeout} value (ms), or the default when it is missing, invalid or not positive */
    public static long timeout(JsonObject moduleConfig) {
        Object value = moduleConfig != null ? moduleConfig.getValue(PDF_EXPORT_TIMEOUT) : null;
        long timeout = -1;
        if (value instanceof Number) {
            timeout = ((Number) value).longValue();
        } else if (value instanceof String) {
            try {
                timeout = Long.parseLong(((String) value).trim());
            } catch (NumberFormatException e) {
                timeout = -1;
            }
        }
        return timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS;
    }

    /**
     * The only two values NodePdfClient needs to send a request: both must be non-empty strings, the url
     * an absolute URI with an explicit port (NodePdfClient reads it with {@code URI.getPort()}).
     */
    public static boolean isConfigured(JsonObject nodePdfConfig) {
        if (nodePdfConfig == null || !isNonEmptyString(nodePdfConfig.getValue(URL))
                || !isNonEmptyString(nodePdfConfig.getValue(AUTH))) {
            return false;
        }
        if (!hasExplicitPort((String) nodePdfConfig.getValue(URL))) {
            LoggerHelper.logWarn(instance, "isConfigured",
                    "node-pdf-generator url must be an absolute URI with an explicit port (e.g. http://pdf:3000)");
            return false;
        }
        return true;
    }

    private static boolean hasExplicitPort(String url) {
        try {
            URI uri = new URI(url.trim());
            return uri.getHost() != null && uri.getPort() != -1;
        } catch (URISyntaxException e) {
            return false;
        }
    }

    private static boolean isNonEmptyString(Object value) {
        return value instanceof String && !((String) value).trim().isEmpty();
    }

    @Override
    public boolean isEnabled() {
        return pdfGenerator != null;
    }

    @Override
    public Future<Pdf> generatePdfFromTemplate(String name, String template) {
        PdfGenerator generator = this.pdfGenerator;
        if (generator == null) {
            return Future.failedFuture(PDF_UNAVAILABLE_ERROR);
        }
        try {
            // NodePdfClient throws a synchronous NullPointerException while its asynchronous init has not
            // completed (or has failed): caught here like any other failure.
            Future<Pdf> future = generator.generatePdfFromTemplate(name, template);
            return future != null ? withTimeout(future) : Future.failedFuture("PDF generator returned no result");
        } catch (Exception e) {
            LoggerHelper.logError(this, "generatePdfFromTemplate", "PDF generation threw",
                    e.getClass().getSimpleName() + ": " + e.getMessage());
            return Future.failedFuture(e);
        }
    }

    /** The first to settle wins: the generation, or the timer (a late answer is then ignored). */
    private Future<Pdf> withTimeout(Future<Pdf> generation) {
        Vertx timerVertx = this.vertx;
        if (timerVertx == null || generation.isComplete()) {
            return generation;
        }
        long timeout = this.timeoutMs;
        Promise<Pdf> promise = Promise.promise();
        long timerId = timerVertx.setTimer(timeout, id -> {
            if (promise.tryFail(PDF_TIMEOUT_ERROR)) {
                LoggerHelper.logError(this, "generatePdfFromTemplate", PDF_TIMEOUT_ERROR, "no answer after " + timeout + " ms");
            }
        });
        generation.onComplete(ar -> {
            timerVertx.cancelTimer(timerId);
            if (ar.succeeded()) {
                promise.tryComplete(ar.result());
            } else {
                promise.tryFail(ar.cause());
            }
        });
        return promise.future();
    }
}
