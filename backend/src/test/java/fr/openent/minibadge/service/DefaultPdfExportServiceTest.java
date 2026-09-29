package fr.openent.minibadge.service;

import fr.openent.minibadge.service.impl.DefaultPdfExportService;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.Vertx;
import io.vertx.core.buffer.Buffer;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.unit.Async;
import io.vertx.ext.unit.TestContext;
import io.vertx.ext.unit.junit.VertxUnitRunner;
import org.entcore.common.pdf.Pdf;
import org.entcore.common.pdf.PdfException;
import org.entcore.common.pdf.PdfGenerator;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

import static org.junit.Assert.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Epic D, Task 1: the startup decision (module block, else the platform's; enabled only with a
 * non-empty url and auth), the single factory built only when enabled — with the module configuration
 * only when it carries the block, never an empty one that would mask the platform's — and a
 * generation that never throws — nor hangs: it is bounded by a timer.
 */
@RunWith(VertxUnitRunner.class)
public class DefaultPdfExportServiceTest {

    private static final String PLATFORM = "{\"pdf-connector-id\":\"exportpdf\",\"auth\":\"platformToken\",\"url\":\"http://pdf:3000\"}";

    private final DefaultPdfExportService service = DefaultPdfExportService.getInstance();
    private PdfGenerator generator;
    /** Every configuration handed to PdfFactory (one entry per factory built). */
    private List<JsonObject> factoryConfigs;
    private Function<JsonObject, PdfGenerator> factory;

    @Before
    public void setUp() {
        generator = mock(PdfGenerator.class);
        factoryConfigs = new ArrayList<>();
        factory = config -> {
            factoryConfigs.add(config);
            return generator;
        };
    }

    private Vertx vertx;

    @After
    public void tearDown(TestContext ctx) {
        service.configure(new JsonObject(), null, config -> null);
        if (vertx != null) vertx.close(ctx.asyncAssertSuccess());
    }

    private static JsonObject moduleConfig(JsonObject block) {
        return new JsonObject().put("app-name", "MiniBadge").put("node-pdf-generator", block);
    }

    private static JsonObject block(String url, String auth) {
        JsonObject block = new JsonObject().put("pdf-connector-id", "exportpdf");
        if (url != null) block.put("url", url);
        if (auth != null) block.put("auth", auth);
        return block;
    }

    @Test
    public void testTheModuleBlockWinsAndIsHandedToTheFactory() {
        JsonObject config = moduleConfig(block("http://module:3000", "moduleToken"));

        service.configure(config, PLATFORM, factory);

        assertTrue(service.isEnabled());
        assertEquals(1, factoryConfigs.size());
        assertSame(config, factoryConfigs.get(0));
        assertEquals("moduleToken", factoryConfigs.get(0).getJsonObject("node-pdf-generator").getString("auth"));
    }

    @Test
    public void testThePlatformConfigurationIsUsedWhenTheModuleHasNoBlock() {
        service.configure(new JsonObject().put("app-name", "MiniBadge"), PLATFORM, factory);

        assertTrue(service.isEnabled());
        // null, not {} nor a config holding an empty block: PdfFactory must read the platform's own.
        assertEquals(1, factoryConfigs.size());
        assertNull(factoryConfigs.get(0));
    }

    @Test
    public void testThePlatformConfigurationMayAlsoBeAJsonObject() {
        service.configure(new JsonObject(), new JsonObject(PLATFORM), factory);

        assertTrue(service.isEnabled());
        assertNull(factoryConfigs.get(0));
    }

    @Test
    public void testNoConfigurationAnywhereLeavesTheExportDisabledWithoutAnyFactory() {
        service.configure(new JsonObject(), null, factory);

        assertFalse(service.isEnabled());
        assertTrue(factoryConfigs.isEmpty());
    }

    @Test
    public void testAnEmptyUrlOrAuthDisablesTheExport() {
        service.configure(moduleConfig(block("", "moduleToken")), null, factory);
        assertFalse(service.isEnabled());
        service.configure(moduleConfig(block("http://module:3000", "  ")), null, factory);
        assertFalse(service.isEnabled());
        service.configure(moduleConfig(block("http://module:3000", null)), null, factory);
        assertFalse(service.isEnabled());
        service.configure(new JsonObject(), "{\"url\":\"http://pdf:3000\",\"auth\":\"\"}", factory);
        assertFalse(service.isEnabled());

        assertTrue(factoryConfigs.isEmpty());
    }

    @Test
    public void testAnUnreadablePlatformValueDisablesTheExport() {
        service.configure(new JsonObject(), "not json", factory);

        assertFalse(service.isEnabled());
        assertTrue(factoryConfigs.isEmpty());
    }

    /**
     * PdfFactory itself prefers ANY module block, even an empty one, over the platform's: the decision
     * mirrors it, so "enabled" never promises a generator PdfFactory would not configure.
     */
    @Test
    public void testAModuleBlockIsTakenAsIsLikePdfFactoryDoes() {
        service.configure(moduleConfig(new JsonObject()), PLATFORM, factory);

        assertFalse(service.isEnabled());
        assertTrue(factoryConfigs.isEmpty());
    }

    @Test
    public void testAFactoryFailureLeavesTheExportDisabled() {
        service.configure(new JsonObject(), PLATFORM, config -> {
            throw new IllegalStateException("boom");
        });

        assertFalse(service.isEnabled());
    }

    @Test
    public void testGenerationReturnsThePdf() {
        service.configure(new JsonObject(), PLATFORM, factory);
        Pdf pdf = new Pdf("minibadge-certificat", Buffer.buffer("%PDF"));
        when(generator.generatePdfFromTemplate("minibadge-certificat", "<html/>")).thenReturn(Future.succeededFuture(pdf));

        Future<Pdf> result = service.generatePdfFromTemplate("minibadge-certificat", "<html/>");

        assertTrue(result.succeeded());
        assertSame(pdf, result.result());
    }

    @Test
    public void testAFailedGenerationIsAFailedFuture() {
        service.configure(new JsonObject(), PLATFORM, factory);
        when(generator.generatePdfFromTemplate(anyString(), anyString()))
                .thenReturn(Future.failedFuture(new PdfException("closed.pdf.response")));

        Future<Pdf> result = service.generatePdfFromTemplate("minibadge-certificat", "<html/>");

        assertTrue(result.failed());
        assertEquals("closed.pdf.response", result.cause().getMessage());
    }

    /** What NodePdfClient does while its asynchronous init has not completed (or failed). */
    @Test
    public void testASynchronousNullPointerExceptionBecomesAFailedFuture() {
        service.configure(new JsonObject(), PLATFORM, factory);
        when(generator.generatePdfFromTemplate(anyString(), anyString())).thenThrow(new NullPointerException());

        Future<Pdf> result = service.generatePdfFromTemplate("minibadge-certificat", "<html/>");

        assertTrue(result.failed());
        assertTrue(result.cause() instanceof NullPointerException);
    }

    @Test
    public void testANullFutureIsAFailure() {
        service.configure(new JsonObject(), PLATFORM, factory);

        assertTrue(service.generatePdfFromTemplate("minibadge-certificat", "<html/>").failed());
    }

    @Test
    public void testGenerationWhileDisabledFailsWithoutAnyCall() {
        service.configure(new JsonObject(), null, factory);

        Future<Pdf> result = service.generatePdfFromTemplate("minibadge-certificat", "<html/>");

        assertTrue(result.failed());
        assertEquals(PdfExportService.PDF_UNAVAILABLE_ERROR, result.cause().getMessage());
        verifyZeroInteractions(generator);
    }

    @Test
    public void testAUrlWithoutAnExplicitPortDisablesTheExport() {
        service.configure(moduleConfig(block("http://pdf", "moduleToken")), null, factory);
        assertFalse(service.isEnabled());
        service.configure(moduleConfig(block("not a uri", "moduleToken")), null, factory);
        assertFalse(service.isEnabled());
        service.configure(moduleConfig(block("pdf:3000", "moduleToken")), null, factory);
        assertFalse(service.isEnabled());

        assertTrue(factoryConfigs.isEmpty());
        assertTrue(DefaultPdfExportService.isConfigured(block("https://pdf.example.org:443", "t")));
    }

    @Test
    public void testTheTimeoutIsReadFromTheModuleConfigurationWithADefault() {
        assertEquals(DefaultPdfExportService.DEFAULT_TIMEOUT_MS, timeoutOf(null));
        assertEquals(DefaultPdfExportService.DEFAULT_TIMEOUT_MS, timeoutOf(new JsonObject()));
        assertEquals(5000L, timeoutOf(new JsonObject().put("pdf-export-timeout", 5000)));
        assertEquals(5000L, timeoutOf(new JsonObject().put("pdf-export-timeout", "5000")));
        assertEquals(DefaultPdfExportService.DEFAULT_TIMEOUT_MS, timeoutOf(new JsonObject().put("pdf-export-timeout", 0)));
        assertEquals(DefaultPdfExportService.DEFAULT_TIMEOUT_MS, timeoutOf(new JsonObject().put("pdf-export-timeout", -1)));
        assertEquals(DefaultPdfExportService.DEFAULT_TIMEOUT_MS, timeoutOf(new JsonObject().put("pdf-export-timeout", "soon")));
        assertEquals(DefaultPdfExportService.DEFAULT_TIMEOUT_MS, timeoutOf(new JsonObject().put("pdf-export-timeout", true)));
    }

    private static long timeoutOf(JsonObject config) {
        return DefaultPdfExportService.timeout(config);
    }

    /** A silent PDF service (NodePdfClient bounds only the connection) fails the generation after the timeout. */
    @Test
    public void testASilentPdfServiceFailsAfterTheTimeout(TestContext ctx) {
        vertx = Vertx.vertx();
        service.configure(vertx, new JsonObject().put("pdf-export-timeout", 50), PLATFORM, factory);
        when(generator.generatePdfFromTemplate(anyString(), anyString())).thenReturn(Promise.<Pdf>promise().future());
        Async async = ctx.async();

        service.generatePdfFromTemplate("minibadge-certificat", "<html/>").onComplete(ar -> {
            ctx.assertTrue(ar.failed());
            ctx.assertEquals(DefaultPdfExportService.PDF_TIMEOUT_ERROR, ar.cause().getMessage());
            async.complete();
        });
    }

    @Test
    public void testALateAnswerAfterTheTimeoutIsIgnored(TestContext ctx) {
        vertx = Vertx.vertx();
        service.configure(vertx, new JsonObject().put("pdf-export-timeout", 50), PLATFORM, factory);
        Promise<Pdf> late = Promise.promise();
        when(generator.generatePdfFromTemplate(anyString(), anyString())).thenReturn(late.future());
        Async async = ctx.async();

        Future<Pdf> result = service.generatePdfFromTemplate("minibadge-certificat", "<html/>");
        result.onComplete(ar -> {
            ctx.assertTrue(ar.failed());
            // Answering now must neither throw nor change the outcome already given.
            late.complete(new Pdf("minibadge-certificat", Buffer.buffer("%PDF")));
            ctx.assertTrue(result.failed());
            ctx.assertEquals(DefaultPdfExportService.PDF_TIMEOUT_ERROR, result.cause().getMessage());
            async.complete();
        });
    }

    @Test
    public void testAnAnswerBeforeTheTimeoutWinsAndTheTimerIsCancelled(TestContext ctx) {
        vertx = Vertx.vertx();
        service.configure(vertx, new JsonObject().put("pdf-export-timeout", 100), PLATFORM, factory);
        Promise<Pdf> answer = Promise.promise();
        when(generator.generatePdfFromTemplate(anyString(), anyString())).thenReturn(answer.future());
        Pdf pdf = new Pdf("minibadge-certificat", Buffer.buffer("%PDF"));
        Async async = ctx.async();

        Future<Pdf> result = service.generatePdfFromTemplate("minibadge-certificat", "<html/>");
        vertx.setTimer(10, id -> answer.complete(pdf));
        // Past the timeout: still the PDF, the timer having been cancelled.
        vertx.setTimer(200, id -> {
            ctx.assertTrue(result.succeeded());
            ctx.assertEquals(pdf, result.result());
            async.complete();
        });
    }
}
