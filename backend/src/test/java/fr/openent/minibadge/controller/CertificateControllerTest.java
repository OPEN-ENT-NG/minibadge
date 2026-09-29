package fr.openent.minibadge.controller;

import fr.openent.minibadge.helper.BadgePictureHelper;
import fr.openent.minibadge.service.BadgeAssignedService;
import fr.openent.minibadge.service.PdfExportService;
import fr.openent.minibadge.service.ServiceRegistry;
import fr.openent.minibadge.service.impl.DefaultPdfExportService;
import fr.wseduc.webutils.template.TemplateProcessor;
import io.vertx.core.Future;
import io.vertx.core.Handler;
import io.vertx.core.MultiMap;
import io.vertx.core.Vertx;
import io.vertx.core.buffer.Buffer;
import io.vertx.core.file.FileSystem;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.http.HttpServerResponse;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.unit.junit.VertxUnitRunner;
import org.entcore.common.pdf.Pdf;
import org.entcore.common.pdf.PdfException;
import org.entcore.common.pdf.PdfGenerator;
import org.entcore.common.user.UserInfos;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.powermock.reflect.Whitebox;
import org.w3c.dom.Document;
import org.xml.sax.InputSource;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.Paths;

import static org.junit.Assert.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Epic D, Task 5: GET /badges/certificate. Every failure ends the response with the same translated
 * 503 — never a 500, never a request left open — and a success is a direct PDF download.
 * The PDF service is a mocked {@link PdfGenerator} behind the real {@link DefaultPdfExportService};
 * the template is the real one, rendered by the real processor.
 */
@RunWith(VertxUnitRunner.class)
public class CertificateControllerTest {

    private static final String PLATFORM = "{\"auth\":\"token\",\"url\":\"http://pdf:3000\"}";
    private static final String SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\"/>";

    private BadgeAssignedService badgeAssignedService;
    private PdfGenerator generator;
    private final DefaultPdfExportService pdfExportService = DefaultPdfExportService.getInstance();
    private HttpServerRequest request;
    private HttpServerResponse response;
    private CertificateController controller;
    private UserInfos user;

    @Before
    public void setUp() throws Exception {
        badgeAssignedService = mock(BadgeAssignedService.class);
        generator = mock(PdfGenerator.class);
        ServiceRegistry.registerService(BadgeAssignedService.class, badgeAssignedService);
        ServiceRegistry.registerService(PdfExportService.class, pdfExportService);
        pdfExportService.configure(new JsonObject(), PLATFORM, config -> generator);

        controller = new CertificateController();

        Vertx vertx = mock(Vertx.class);
        FileSystem fileSystem = mock(FileSystem.class);
        when(vertx.fileSystem()).thenReturn(fileSystem);
        byte[] template = Files.readAllBytes(Paths.get("src/main/resources/pdf/badges-certificate.xhtml"));
        when(fileSystem.readFile(endsWith("badges-certificate.xhtml"))).thenReturn(Future.succeededFuture(Buffer.buffer(template)));
        when(fileSystem.exists(anyString())).thenReturn(Future.succeededFuture(false));
        when(fileSystem.exists("/img/animation.svg")).thenReturn(Future.succeededFuture(true));
        when(fileSystem.readFile("/img/animation.svg")).thenReturn(Future.succeededFuture(Buffer.buffer(SVG)));
        Whitebox.setInternalState(controller, "vertx", vertx);
        Whitebox.setInternalState(controller, "pictureHelper", new BadgePictureHelper(vertx, "/img"));

        request = mock(HttpServerRequest.class);
        response = mock(HttpServerResponse.class);
        when(request.response()).thenReturn(response);
        when(request.headers()).thenReturn(MultiMap.caseInsensitiveMultiMap().add("Host", "ent.example").add("Accept-Language", "fr"));
        when(response.putHeader(anyString(), anyString())).thenReturn(response);
        when(response.setStatusCode(anyInt())).thenReturn(response);
        when(response.setStatusMessage(anyString())).thenReturn(response);

        user = new UserInfos();
        user.setUserId("owner1");
        user.setFirstName("Marie");
        user.setLastName("Curie");
    }

    @After
    public void tearDown() {
        pdfExportService.configure(new JsonObject(), null, config -> null);
    }

    private static JsonObject row(String label, String pictureId, boolean expired) {
        return new JsonObject()
                .put("id", 1L)
                .put("created_at", "2026-07-01T10:15:30.123")
                .put("is_expired", expired)
                .put("label", label)
                .put("description_short", "Tom & Jerry <script>x</script>")
                .put("picture_id", pictureId)
                .put("assignor_display_name", "Jean Dupont")
                .put("category_names", "Engagement");
    }

    private void givenAssignments(JsonObject... rows) {
        JsonArray array = new JsonArray();
        for (JsonObject row : rows) array.add(row);
        when(badgeAssignedService.getReceivedAssignments("owner1")).thenReturn(Future.succeededFuture(array));
    }

    private void assertUnavailable() {
        verify(response).setStatusCode(503);
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(response, times(1)).end(body.capture());
        verify(response, never()).end(any(Buffer.class));
        assertEquals(PdfExportService.PDF_UNAVAILABLE_ERROR, new JsonObject(body.getValue()).getString("error"));
    }

    @Test
    public void testDisabledExportAnswers503AtOnceWithoutAnyCall() {
        pdfExportService.configure(new JsonObject(), null, config -> generator);

        controller.getCertificate(request);

        assertUnavailable();
        verifyZeroInteractions(badgeAssignedService);
        verifyZeroInteractions(generator);
    }

    @Test
    public void testSuccessIsADirectPdfDownload() throws Exception {
        givenAssignments(row("Animation", "animation.svg", false), row("Expiré & <local>", "../etc/passwd", true));
        Buffer content = Buffer.buffer("%PDF-1.4");
        when(generator.generatePdfFromTemplate(anyString(), anyString()))
                .thenReturn(Future.succeededFuture(new Pdf("minibadge-certificat", content)));

        controller.exportCertificate(request, user);

        verify(response).putHeader("Content-Type", "application/pdf");
        verify(response).putHeader("Content-Disposition", "attachment; filename=\"minibadge-certificat.pdf\"");
        verify(response).setStatusCode(200);
        verify(response, times(1)).end(content);
        verify(response, never()).end(anyString());

        ArgumentCaptor<String> xhtml = ArgumentCaptor.forClass(String.class);
        verify(generator).generatePdfFromTemplate(eq("minibadge-certificat"), xhtml.capture());
        Document document = parse(xhtml.getValue());
        String text = document.getDocumentElement().getTextContent();
        assertTrue(text.contains("Marie Curie"));
        // Free text is escaped (a label keeps its "<", a description loses its markup, as in the web app).
        assertTrue(text.contains("Expiré & <local>"));
        assertTrue(text.contains("Tom & Jerry x"));
        assertEquals(0, document.getElementsByTagNameNS("*", "script").getLength());
        // Only the allowed, existing picture is inlined; the traversal attempt renders no image.
        assertEquals(1, document.getElementsByTagNameNS("*", "img").getLength());
        assertFalse(xhtml.getValue().contains("passwd"));
    }

    @Test
    public void testAFailedGenerationAnswers503() {
        givenAssignments(row("Animation", "animation.svg", false));
        when(generator.generatePdfFromTemplate(anyString(), anyString()))
                .thenReturn(Future.failedFuture(new PdfException("invalid.pdf.response")));

        controller.exportCertificate(request, user);

        assertUnavailable();
    }

    /** NodePdfClient's synchronous NullPointerException, before its asynchronous init has completed. */
    @Test
    public void testASynchronousNullPointerExceptionAnswers503() {
        givenAssignments(row("Animation", "animation.svg", false));
        when(generator.generatePdfFromTemplate(anyString(), anyString())).thenThrow(new NullPointerException());

        controller.exportCertificate(request, user);

        assertUnavailable();
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testANullTemplateWriterAnswers503WithoutCallingThePdfService() {
        givenAssignments(row("Animation", "animation.svg", false));
        TemplateProcessor processor = mock(TemplateProcessor.class);
        doAnswer(invocation -> {
            ((Handler<Writer>) invocation.getArgument(2)).handle(null);
            return null;
        }).when(processor).processTemplateToWriter(anyString(), any(JsonObject.class), any(Handler.class));
        Whitebox.setInternalState(controller, "templateProcessor", processor);

        controller.exportCertificate(request, user);

        assertUnavailable();
        verifyZeroInteractions(generator);
    }

    @Test
    public void testADatabaseFailureAnswers503() {
        when(badgeAssignedService.getReceivedAssignments("owner1")).thenReturn(Future.failedFuture("boom"));

        controller.exportCertificate(request, user);

        assertUnavailable();
        verifyZeroInteractions(generator);
    }

    @Test
    public void testASynchronousServiceExceptionAnswers503() {
        when(badgeAssignedService.getReceivedAssignments("owner1")).thenThrow(new IllegalStateException("boom"));

        controller.exportCertificate(request, user);

        assertUnavailable();
    }

    @Test
    public void testAPdfWithoutContentAnswers503() {
        givenAssignments(row("Animation", "animation.svg", false));
        when(generator.generatePdfFromTemplate(anyString(), anyString()))
                .thenReturn(Future.succeededFuture(new Pdf("minibadge-certificat", null)));

        controller.exportCertificate(request, user);

        assertUnavailable();
    }

    /** A response failing half-way is still ended (a bare 503), and nothing escapes to the event loop. */
    @Test
    public void testAFailureWhileSendingThePdfStillEndsTheResponse() {
        givenAssignments(row("Animation", "animation.svg", false));
        when(generator.generatePdfFromTemplate(anyString(), anyString()))
                .thenReturn(Future.succeededFuture(new Pdf("minibadge-certificat", Buffer.buffer("%PDF"))));
        doThrow(new IllegalStateException("connection reset")).when(response).end(any(Buffer.class));

        controller.exportCertificate(request, user);

        verify(response).setStatusCode(503);
        verify(response).end();
    }

    /** Logging comes after the answer, and a logging failure cannot escape either. */
    @Test
    public void testAFailureWhileLoggingNeitherEscapesNorPreventsTheAnswer() {
        UserInfos failingUser = spy(user);
        doReturn("owner1").doThrow(new IllegalStateException("log boom")).when(failingUser).getUserId();
        givenAssignments(row("Animation", "animation.svg", false));
        when(generator.generatePdfFromTemplate(anyString(), anyString()))
                .thenReturn(Future.failedFuture(new PdfException("invalid.pdf.response")));

        controller.exportCertificate(request, failingUser);

        assertUnavailable();
    }

    @Test
    public void testAnEmptyListStillProducesACertificate() throws Exception {
        givenAssignments();
        when(generator.generatePdfFromTemplate(anyString(), anyString()))
                .thenReturn(Future.succeededFuture(new Pdf("minibadge-certificat", Buffer.buffer("%PDF"))));

        controller.exportCertificate(request, user);

        verify(response).setStatusCode(200);
        ArgumentCaptor<String> xhtml = ArgumentCaptor.forClass(String.class);
        verify(generator).generatePdfFromTemplate(anyString(), xhtml.capture());
        assertTrue(parse(xhtml.getValue()).getDocumentElement().getTextContent().contains("minibadge.certificate.empty"));
    }

    private static Document parse(String xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
        return factory.newDocumentBuilder().parse(new InputSource(new StringReader(xml)));
    }
}
