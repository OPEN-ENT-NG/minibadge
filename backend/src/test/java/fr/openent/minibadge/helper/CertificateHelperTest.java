package fr.openent.minibadge.helper;

import fr.wseduc.webutils.template.TemplateProcessor;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.unit.junit.VertxUnitRunner;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;

import static org.junit.Assert.*;

/**
 * Epic D, Task 4: the certificate's properties and the REAL template, rendered by the same
 * {@link TemplateProcessor} configuration as the controller (HTML escaping on). The template is sent
 * as application/xml, so every rendering must stay well-formed XML — free-text descriptions included.
 */
@RunWith(VertxUnitRunner.class)
public class CertificateHelperTest {

    private static final Function<String, String> TRANSLATE = key -> "[" + key + "]";
    private static final LocalDate TODAY = LocalDate.of(2026, 9, 29);

    static String template() throws Exception {
        return new String(Files.readAllBytes(Paths.get("src/main/resources/" + CertificateHelper.TEMPLATE_PATH)),
                StandardCharsets.UTF_8);
    }

    static String render(JsonObject props) throws Exception {
        AtomicReference<String> output = new AtomicReference<>();
        new TemplateProcessor().escapeHTML(true)
                .processTemplateToWriter(template(), props, writer -> output.set(writer == null ? null : writer.toString()));
        assertNotNull("the template must render", output.get());
        return output.get();
    }

    /** Parses as XML (without fetching the XHTML DTD): throws on any well-formedness error. */
    static Document parse(String xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
        DocumentBuilder builder = factory.newDocumentBuilder();
        builder.setErrorHandler(null);
        return builder.parse(new InputSource(new StringReader(xml)));
    }

    private static JsonObject assignment(long id, String label, String description, String pictureId, boolean expired) {
        JsonObject row = new JsonObject()
                .put("id", id)
                .put("created_at", "2026-07-01T10:15:30.123456")
                .put("is_expired", expired)
                .put("badge_type_id", id + 100)
                .put("label", label)
                .put("assignor_display_name", "Jean Dupont")
                .put("category_names", "Engagement, Solidarité");
        if (description != null) row.put("description_short", description);
        if (pictureId != null) row.put("picture_id", pictureId);
        return row;
    }

    @Test
    public void testDatesAreFormattedAsDayMonthYear() {
        assertEquals("01/07/2026", CertificateHelper.formatDate("2026-07-01T10:15:30.123"));
        assertEquals("01/07/2026", CertificateHelper.formatDate("2026-07-01 10:15:30"));
        assertEquals("", CertificateHelper.formatDate(null));
        assertEquals("", CertificateHelper.formatDate("garbage-date"));
    }

    @Test
    public void testMarkupIsStrippedFromDescriptions() {
        assertEquals("Tu aimes l'animation. Et plus.", CertificateHelper.stripTags("<p>Tu aimes l'animation.</p><p>Et plus.</p>"));
        assertNull(CertificateHelper.stripTags("<p> </p>"));
        assertNull(CertificateHelper.stripTags(null));
    }

    @Test
    public void testPropsCarryOneRowPerAssignmentWithItsStatus() {
        Map<String, String> pictures = new HashMap<>();
        pictures.put("animation.svg", "data:image/svg+xml;base64,PHN2Zy8+");
        JsonArray rows = new JsonArray()
                .add(assignment(1, "Animation", "<p>Court</p>", "animation.svg", false))
                .add(assignment(2, "Local", null, "../etc/passwd", true));

        JsonObject props = CertificateHelper.templateProps(rows, pictures, "Marie Curie", TODAY, TRANSLATE);

        assertEquals("Marie Curie", props.getString("ownerName"));
        assertEquals("29/09/2026", props.getString("generatedOn"));
        assertEquals(2, (int) props.getInteger("count"));
        assertTrue(props.getBoolean("hasAssignments"));
        JsonObject active = props.getJsonArray("assignments").getJsonObject(0);
        assertEquals("Animation", active.getString("label"));
        assertEquals("Court", active.getString("description"));
        assertEquals("Engagement, Solidarité", active.getString("categories"));
        assertEquals("Jean Dupont", active.getString("assignor"));
        assertEquals("01/07/2026", active.getString("date"));
        assertFalse(active.getBoolean("expired"));
        assertEquals("[minibadge.badge.active]", active.getString("status"));
        assertEquals("data:image/svg+xml;base64,PHN2Zy8+", active.getString("image"));
        JsonObject expired = props.getJsonArray("assignments").getJsonObject(1);
        assertTrue(expired.getBoolean("expired"));
        assertEquals("[minibadge.badge.expired]", expired.getString("status"));
        assertFalse(expired.containsKey("image"));
        assertFalse(expired.containsKey("description"));
    }

    @Test
    public void testTheRenderedCertificateIsWellFormedXmlWithOneRowPerAssignment() throws Exception {
        Map<String, String> pictures = Collections.singletonMap("animation.svg", "data:image/svg+xml;base64,PHN2Zy8+");
        JsonArray rows = new JsonArray()
                .add(assignment(1, "Animation", "Court", "animation.svg", false))
                .add(assignment(2, "Local", null, null, true));

        String xml = render(CertificateHelper.templateProps(rows, pictures, "Marie Curie", TODAY, TRANSLATE));
        Document document = parse(xml);

        // header row + one row per assignment
        assertEquals(3, document.getElementsByTagNameNS("*", "tr").getLength());
        NodeList images = document.getElementsByTagNameNS("*", "img");
        assertEquals(1, images.getLength());
        assertEquals("data:image/svg+xml;base64,PHN2Zy8+", images.item(0).getAttributes().getNamedItem("src").getNodeValue());
        assertTrue(document.getDocumentElement().getTextContent().contains("[minibadge.badge.expired]"));
        assertTrue(document.getDocumentElement().getTextContent().contains("29/09/2026"));
        // One description only: an absent one renders no empty block.
        assertEquals(1, countClass(document, "description"));
        assertFalse(xml.contains("[minibadge.certificate.empty]"));
    }

    @Test
    public void testFreeTextIsEscapedAndTheDocumentStaysWellFormed() throws Exception {
        String hostile = "Tom & Jerry <script>alert('x')</script> \"quoted\" ]]> <b>";
        JsonObject row = assignment(1, hostile, hostile, null, false)
                .put("assignor_display_name", "O'Brien & <Co>")
                .put("category_names", "A & B");

        String xml = render(CertificateHelper.templateProps(new JsonArray().add(row), Collections.emptyMap(),
                "<Marie> & Co", TODAY, key -> "Label & <" + key + ">"));
        // Kept for a manual check with an external validator (e.g. xmllint --noout target/...).
        Files.write(Paths.get("target/certificate-sample.xhtml"), xml.getBytes(StandardCharsets.UTF_8));
        Document document = parse(xml);

        assertFalse(xml.contains("<script>"));
        assertEquals(0, document.getElementsByTagNameNS("*", "script").getLength());
        assertEquals(0, document.getElementsByTagNameNS("*", "b").getLength());
        String text = document.getDocumentElement().getTextContent();
        assertTrue(text.contains("Tom & Jerry <script>alert('x')</script>"));
        assertTrue(text.contains("O'Brien & <Co>"));
        assertTrue(text.contains("<Marie> & Co"));
        assertTrue(text.contains("A & B"));
    }

    @Test
    public void testDescriptionEntitiesAreDecodedOnceTheTagsAreGone() {
        assertEquals("Tu es cr\u00e9atif & curieux.",
                CertificateHelper.stripTags("<p>Tu&nbsp;es cr&eacute;atif &amp; curieux.</p>"));
        assertEquals("\u00e0 \u00e8 \u00e7 \u00ea \u00f4 \u00f9 \u00ee \u00eb \u00c9",
                CertificateHelper.stripTags("&agrave; &egrave; &ccedil; &ecirc; &ocirc; &ugrave; &icirc; &euml; &Eacute;"));
        assertEquals("\"a\" 'b' 'c' <b> A \u00e9", CertificateHelper.stripTags("&quot;a&quot; &#39;b&#39; &apos;c&apos; &lt;b&gt; &#65; &#xE9;"));
        // Decoded once only, and an unknown entity is kept as written.
        assertEquals("&lt; &unknown;", CertificateHelper.stripTags("&amp;lt; &unknown;"));
        // A decoded non-breaking space is whitespace like any other.
        assertNull(CertificateHelper.stripTags("<p>&nbsp;&#160;</p>"));
    }

    @Test
    public void testCharactersForbiddenByXmlAreRemoved() {
        assertEquals("ab\tc\nd", CertificateHelper.xmlSafe("a\u000Bb\u0008\tc\nd\u001F"));
        assertEquals("\ud83c\udfc5 ok", CertificateHelper.xmlSafe("\ud83c\udfc5 ok\uFFFE"));
        // A lone surrogate is not a character either.
        assertEquals("ab", CertificateHelper.xmlSafe("a\ud83cb\udfc5"));
        assertNull(CertificateHelper.xmlSafe(null));
        // A numeric entity naming a control character does not bring it back.
        assertEquals("ab", CertificateHelper.stripTags("a&#11;b"));
    }

    @Test
    public void testControlCharactersInFreeTextKeepTheDocumentWellFormed() throws Exception {
        String dirty = "Bad\u000Bge\u0008 \u001Fname";
        JsonObject row = assignment(1, dirty, "<p>Des\u000Bcription\u0008 &eacute;crite</p>", null, false)
                .put("assignor_display_name", "Jean\u001F Dupont")
                .put("category_names", "Cat\u0008\u000B");

        JsonObject props = CertificateHelper.templateProps(new JsonArray().add(row), Collections.emptyMap(),
                "Marie\u000B Curie", TODAY, key -> "[" + key + "]\u0001");
        String xml = render(props);
        Document document = parse(xml);

        JsonObject rendered = props.getJsonArray("assignments").getJsonObject(0);
        assertEquals("Badge name", rendered.getString("label"));
        assertEquals("Description \u00e9crite", rendered.getString("description"));
        assertEquals("Jean Dupont", rendered.getString("assignor"));
        assertEquals("Cat", rendered.getString("categories"));
        assertEquals("Marie Curie", props.getString("ownerName"));
        assertEquals("[minibadge.certificate.title]", props.getJsonObject("labels").getString("title"));
        assertEquals("[minibadge.badge.active]", rendered.getString("status"));
        String text = document.getDocumentElement().getTextContent();
        assertTrue(text.contains("Badge name"));
        assertTrue(text.contains("Description \u00e9crite"));
    }

    @Test
    public void testAnEmptyListRendersTheTranslatedMessage() throws Exception {
        String xml = render(CertificateHelper.templateProps(new JsonArray(), Collections.emptyMap(), "Marie Curie",
                TODAY, TRANSLATE));
        Document document = parse(xml);

        assertEquals(0, document.getElementsByTagNameNS("*", "table").getLength());
        assertTrue(document.getDocumentElement().getTextContent().contains("[minibadge.certificate.empty]"));
    }

    private static int countClass(Document document, String className) {
        NodeList divs = document.getElementsByTagNameNS("*", "div");
        int count = 0;
        for (int i = 0; i < divs.getLength(); i++) {
            if (divs.item(i).getAttributes().getNamedItem("class") != null
                    && className.equals(divs.item(i).getAttributes().getNamedItem("class").getNodeValue())) {
                count++;
            }
        }
        return count;
    }
}
