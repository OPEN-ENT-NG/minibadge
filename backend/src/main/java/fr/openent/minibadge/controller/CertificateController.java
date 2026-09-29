package fr.openent.minibadge.controller;

import fr.openent.minibadge.core.constants.Request;
import fr.openent.minibadge.helper.BadgePictureHelper;
import fr.openent.minibadge.helper.CertificateHelper;
import fr.openent.minibadge.helper.LoggerHelper;
import fr.openent.minibadge.security.ViewRight;
import fr.openent.minibadge.service.BadgeAssignedService;
import fr.openent.minibadge.service.PdfExportService;
import fr.openent.minibadge.service.ServiceRegistry;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import fr.wseduc.webutils.I18n;
import fr.wseduc.webutils.data.FileResolver;
import fr.wseduc.webutils.http.Renders;
import fr.wseduc.webutils.template.TemplateProcessor;
import io.vertx.core.AsyncResult;
import io.vertx.core.CompositeFuture;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.http.HttpServerResponse;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.http.filter.ResourceFilter;
import org.entcore.common.pdf.Pdf;
import org.entcore.common.user.UserInfos;
import org.entcore.common.user.UserUtils;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

import static fr.openent.minibadge.core.constants.Field.PICTURE_ID;

/**
 * Epic D: PDF certificate of the badges the current user received.
 * <p>
 * Every failure — export disabled, database, template, PDF service (unreachable, non-200 answer, or
 * the synchronous NullPointerException {@code NodePdfClient} throws before its init completes) — ends
 * the response with the same translated 503: the request is never left hanging, and never a 500.
 */
public class CertificateController extends ControllerHelper {

    private static final String PICTURE_DIRECTORY = "public/img";

    private final BadgeAssignedService badgeAssignedService = ServiceRegistry.getService(BadgeAssignedService.class);
    private final PdfExportService pdfExportService = ServiceRegistry.getService(PdfExportService.class);
    /**
     * Own processor, HTML escaping always on: the shared Renders processor has its escaping toggled by
     * other callers, and every value this template receives (labels included) must be escaped.
     */
    private TemplateProcessor templateProcessor = new TemplateProcessor().escapeHTML(true);
    private BadgePictureHelper pictureHelper;
    private volatile String template;

    @Get("/badges/certificate")
    @ApiDoc("Download the PDF certificate of the badges the current user received")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ViewRight.class)
    public void getCertificate(HttpServerRequest request) {
        if (!pdfExportService.isEnabled()) {
            renderUnavailable(request);
            return;
        }
        UserUtils.getUserInfos(eb, request, user -> {
            if (user == null) {
                unauthorized(request);
                return;
            }
            exportCertificate(request, user);
        });
    }

    /** Always ends the response: a PDF (200) or the translated 503. */
    void exportCertificate(HttpServerRequest request, UserInfos user) {
        Future<Pdf> pdf;
        try {
            String host = Renders.getHost(request);
            String language = I18n.acceptLanguage(request);
            Function<String, String> translate = key -> I18n.getInstance().translate(key, host, language);
            pdf = badgeAssignedService.getReceivedAssignments(user.getUserId())
                    .compose(assignments -> loadPictures(assignments)
                            .map(pictures -> CertificateHelper.templateProps(assignments, pictures, ownerName(user),
                                    LocalDate.now(), translate)))
                    .compose(props -> loadTemplate().compose(xhtml -> render(xhtml, props)))
                    .compose(xhtml -> pdfExportService.generatePdfFromTemplate(CertificateHelper.PDF_NAME, xhtml));
        } catch (Exception e) {
            pdf = Future.failedFuture(e);
        }
        // The response is ended first, whatever happens; logging comes last and can never escape.
        pdf.onComplete(ar -> {
            boolean generated = false;
            Throwable sendFailure = null;
            try {
                generated = ar.succeeded() && ar.result() != null && ar.result().getContent() != null;
                if (generated) {
                    sendPdf(request, ar.result());
                } else {
                    renderUnavailable(request);
                }
            } catch (Throwable t) {
                sendFailure = t;
                endQuietly(request);
            }
            logOutcome(ar, user, generated, sendFailure);
        });
    }

    private void logOutcome(AsyncResult<Pdf> ar, UserInfos user, boolean generated, Throwable sendFailure) {
        try {
            if (!generated) {
                String cause = ar.failed() ? String.valueOf(ar.cause().getMessage()) : "empty PDF";
                LoggerHelper.logError(this, "exportCertificate",
                        "Fail to generate the certificate of user " + user.getUserId(), cause);
            }
            if (sendFailure != null) {
                LoggerHelper.logError(this, "exportCertificate", "Fail to send the certificate",
                        String.valueOf(sendFailure.getMessage()));
            }
        } catch (Throwable ignored) {
            // the response is already ended: a logging failure must not reach the event loop
        }
    }

    private Future<Map<String, String>> loadPictures(JsonArray assignments) {
        Set<String> pictureIds = new LinkedHashSet<>();
        assignments.stream()
                .filter(JsonObject.class::isInstance)
                .map(row -> ((JsonObject) row).getString(PICTURE_ID))
                .filter(BadgePictureHelper::isAllowedPictureId)
                .forEach(pictureIds::add);
        if (pictureIds.isEmpty()) {
            return Future.succeededFuture(new HashMap<>());
        }
        List<String> ids = new ArrayList<>(pictureIds);
        List<Future> dataUris = new ArrayList<>();
        ids.forEach(id -> dataUris.add(pictureHelper().toDataUri(id)));
        return CompositeFuture.all(dataUris).map(all -> {
            Map<String, String> pictures = new HashMap<>();
            for (int i = 0; i < ids.size(); i++) {
                String dataUri = all.resultAt(i);
                if (dataUri != null) pictures.put(ids.get(i), dataUri);
            }
            return pictures;
        });
    }

    private BadgePictureHelper pictureHelper() {
        if (pictureHelper == null) {
            String directory = FileResolver.absolutePath(PICTURE_DIRECTORY);
            pictureHelper = new BadgePictureHelper(vertx, directory != null ? directory : PICTURE_DIRECTORY);
        }
        return pictureHelper;
    }

    private Future<String> loadTemplate() {
        String cached = template;
        if (cached != null) {
            return Future.succeededFuture(cached);
        }
        return vertx.fileSystem().readFile(FileResolver.absolutePath(CertificateHelper.TEMPLATE_PATH))
                .map(buffer -> {
                    template = buffer.toString(StandardCharsets.UTF_8);
                    return template;
                });
    }

    /** The processor hands a null writer on a template error: turned into a failure. */
    private Future<String> render(String xhtml, JsonObject props) {
        Promise<String> promise = Promise.promise();
        try {
            templateProcessor.processTemplateToWriter(xhtml, props, writer -> {
                if (writer == null) {
                    promise.tryFail("Fail to process the certificate template");
                } else {
                    promise.tryComplete(writer.toString());
                }
            });
        } catch (Exception e) {
            promise.tryFail(e);
        }
        return promise.future();
    }

    private static String ownerName(UserInfos user) {
        String firstName = user.getFirstName() != null ? user.getFirstName().trim() : "";
        String lastName = user.getLastName() != null ? user.getLastName().trim() : "";
        String name = (firstName + " " + lastName).trim();
        return name.isEmpty() ? user.getUsername() : name;
    }

    private static void sendPdf(HttpServerRequest request, Pdf pdf) {
        HttpServerResponse response = request.response();
        response.putHeader("Content-Type", "application/pdf");
        response.putHeader("Content-Disposition", "attachment; filename=\"" + CertificateHelper.PDF_FILENAME + "\"");
        response.putHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        response.setStatusCode(200);
        response.end(pdf.getContent());
    }

    private static void renderUnavailable(HttpServerRequest request) {
        String message = PdfExportService.PDF_UNAVAILABLE_ERROR;
        try {
            message = I18n.getInstance().translate(PdfExportService.PDF_UNAVAILABLE_ERROR,
                    Renders.getHost(request), I18n.acceptLanguage(request));
        } catch (Exception e) {
            // keep the key: the answer matters more than its wording
        }
        renderJson(request, new JsonObject().put(Request.ERROR, message), 503);
    }

    /** Last resort, when even the error answer failed half-way: never leave the request open. */
    private static void endQuietly(HttpServerRequest request) {
        try {
            HttpServerResponse response = request.response();
            if (!response.ended()) {
                if (!response.headWritten()) response.setStatusCode(503);
                response.end();
            }
        } catch (Throwable ignored) {
            // the connection is gone
        }
    }
}
