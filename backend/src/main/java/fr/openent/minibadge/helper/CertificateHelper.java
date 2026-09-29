package fr.openent.minibadge.helper;

import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static fr.openent.minibadge.core.constants.Field.*;

/**
 * Epic D: builds the properties of the certificate template ({@code pdf/badges-certificate.xhtml}).
 * <p>
 * Every text, translated labels included, is given to the template as a plain value rendered with
 * {@code {{x}}} (HTML-escaped): locally created badge descriptions are free text, and the template is
 * sent to the PDF service as XML, so a single raw {@code &} or {@code <} would make it unreadable.
 * Escaping does not cover the characters XML 1.0 forbids outright (most C0 controls, lone surrogates...):
 * those are removed from every text by {@link #xmlSafe(String)}.
 */
public final class CertificateHelper {

    public static final String TEMPLATE_PATH = "pdf/badges-certificate.xhtml";
    public static final String PDF_NAME = "minibadge-certificat";
    public static final String PDF_FILENAME = PDF_NAME + ".pdf";

    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Pattern ENTITY = Pattern.compile("&(#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]{1,7});");
    /** The named entities rich-text editors commonly write in French descriptions. */
    private static final Map<String, String> NAMED_ENTITIES = namedEntities();

    private CertificateHelper() {
        throw new IllegalStateException("Utility class");
    }

    /**
     * @param assignments rows of {@code BadgeAssignedService#getReceivedAssignments}
     * @param pictures    data URI by picture id (a missing entry renders no image)
     * @param ownerName   name of the certificate's owner
     * @param generatedOn generation day
     * @param translate   i18n key to translated text, in the requester's language
     */
    public static JsonObject templateProps(JsonArray assignments, Map<String, String> pictures, String ownerName,
                                           LocalDate generatedOn, Function<String, String> translate) {
        JsonArray rows = new JsonArray();
        assignments.stream()
                .filter(JsonObject.class::isInstance)
                .map(JsonObject.class::cast)
                .forEach(assignment -> {
                    boolean expired = Boolean.TRUE.equals(assignment.getBoolean(IS_EXPIRED));
                    String pictureId = assignment.getString(PICTURE_ID);
                    // Only non-null values are put: a null would reach the template as "" (its default
                    // value), which JMustache treats as a TRUE section.
                    JsonObject row = new JsonObject()
                            .put("label", xmlSafe(assignment.getString(LABEL, "")))
                            .put("categories", xmlSafe(assignment.getString(CATEGORY_NAMES, "")))
                            .put("assignor", xmlSafe(assignment.getString(ASSIGNOR_DISPLAY_NAME, "")))
                            .put("date", formatDate(assignment.getString(CREATED_AT)))
                            .put("expired", expired)
                            .put("status", xmlSafe(translate.apply(expired ? "minibadge.badge.expired" : "minibadge.badge.active")));
                    String description = stripTags(firstNonEmpty(assignment.getString(DESCRIPTION_SHORT),
                            assignment.getString(DESCRIPTION)));
                    if (description != null) row.put("description", description);
                    String image = pictureId != null ? pictures.get(pictureId) : null;
                    if (image != null) row.put("image", image);
                    rows.add(row);
                });

        Function<String, String> label = key -> xmlSafe(translate.apply(key));
        JsonObject labels = new JsonObject()
                .put("title", label.apply("minibadge.certificate.title"))
                .put("owner", label.apply("minibadge.certificate.owner"))
                .put("generatedOn", label.apply("minibadge.certificate.generated.on"))
                .put("count", label.apply("minibadge.certificate.count"))
                .put("badge", label.apply("minibadge.badge"))
                .put("categories", label.apply("minibadge.certificate.categories"))
                .put("assignedBy", label.apply("minibadge.certificate.assigned.by"))
                .put("date", label.apply("minibadge.certificate.date"))
                .put("status", label.apply("minibadge.badge.status"))
                .put("empty", label.apply("minibadge.certificate.empty"));

        return new JsonObject()
                .put("labels", labels)
                .put("ownerName", ownerName != null ? xmlSafe(ownerName) : "")
                .put("generatedOn", generatedOn.format(DISPLAY_DATE))
                .put("count", rows.size())
                .put("hasAssignments", !rows.isEmpty())
                .put("assignments", rows);
    }

    /**
     * @param dbDate a database timestamp ({@code 2026-07-01T10:15:30.123} or {@code 2026-07-01 10:15:30...})
     * @return the day as DD/MM/YYYY, or an empty string when it cannot be read
     */
    public static String formatDate(String dbDate) {
        if (dbDate == null || dbDate.length() < 10) return "";
        try {
            return LocalDate.parse(dbDate.substring(0, 10)).format(DISPLAY_DATE);
        } catch (DateTimeParseException e) {
            return "";
        }
    }

    /**
     * Badge descriptions may carry markup ({@code <p>...</p>} in the central ones, see sql/015): shown as
     * plain text, like the web app does ({@code stripHtmlTags}), then escaped by the template. Their
     * entities are decoded once the tags are gone (so {@code &lt;b&gt;} stays text), otherwise the
     * template would escape them again and print {@code &amp;eacute;}.
     */
    public static String stripTags(String value) {
        if (value == null) return null;
        String text = xmlSafe(decodeEntities(value.replaceAll("<[^>]*>", " ")))
                .replaceAll("[\\s\\u00A0]+", " ").trim();
        return text.isEmpty() ? null : text;
    }

    /**
     * @return the value without the characters outside the XML 1.0 {@code Char} production (null stays null)
     * <p>
     * Filtered by code point rather than with the equivalent negated regex class: on Java 8, after failing
     * at a surrogate pair, the matcher retries on its low half alone and removes it, breaking every emoji.
     */
    public static String xmlSafe(String value) {
        if (value == null) return null;
        StringBuilder safe = new StringBuilder(value.length());
        value.codePoints().filter(CertificateHelper::isXmlChar).forEach(safe::appendCodePoint);
        return safe.toString();
    }

    private static boolean isXmlChar(int codePoint) {
        return codePoint == 0x9 || codePoint == 0xA || codePoint == 0xD
                || (codePoint >= 0x20 && codePoint <= 0xD7FF)
                || (codePoint >= 0xE000 && codePoint <= 0xFFFD)
                || (codePoint >= 0x10000 && codePoint <= 0x10FFFF);
    }

    /** Single pass: {@code &amp;lt;} gives {@code &lt;}, never {@code <}. Unknown entities are kept as they are. */
    static String decodeEntities(String value) {
        Matcher matcher = ENTITY.matcher(value);
        StringBuffer decoded = new StringBuffer();
        while (matcher.find()) {
            String entity = matcher.group(1);
            String replacement = matcher.group();
            if (entity.charAt(0) == '#') {
                boolean hex = entity.length() > 1 && (entity.charAt(1) == 'x' || entity.charAt(1) == 'X');
                int codePoint = Integer.parseInt(entity.substring(hex ? 2 : 1), hex ? 16 : 10);
                replacement = Character.isValidCodePoint(codePoint) ? new String(Character.toChars(codePoint)) : "";
            } else if (NAMED_ENTITIES.containsKey(entity)) {
                replacement = NAMED_ENTITIES.get(entity);
            }
            matcher.appendReplacement(decoded, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(decoded);
        return decoded.toString();
    }

    private static Map<String, String> namedEntities() {
        Map<String, String> entities = new HashMap<>();
        entities.put("nbsp", " ");
        entities.put("amp", "&");
        entities.put("lt", "<");
        entities.put("gt", ">");
        entities.put("quot", "\"");
        entities.put("apos", "'");
        String[][] accented = {
                {"agrave", "\u00E0"}, {"acirc", "\u00E2"}, {"auml", "\u00E4"}, {"aelig", "\u00E6"}, {"ccedil", "\u00E7"},
                {"eacute", "\u00E9"}, {"egrave", "\u00E8"}, {"ecirc", "\u00EA"}, {"euml", "\u00EB"}, {"icirc", "\u00EE"}, {"iuml", "\u00EF"},
                {"ocirc", "\u00F4"}, {"ouml", "\u00F6"}, {"oelig", "\u0153"}, {"ugrave", "\u00F9"}, {"ucirc", "\u00FB"}, {"uuml", "\u00FC"},
                {"yuml", "\u00FF"},
                {"Agrave", "\u00C0"}, {"Acirc", "\u00C2"}, {"Auml", "\u00C4"}, {"AElig", "\u00C6"}, {"Ccedil", "\u00C7"},
                {"Eacute", "\u00C9"}, {"Egrave", "\u00C8"}, {"Ecirc", "\u00CA"}, {"Euml", "\u00CB"}, {"Icirc", "\u00CE"}, {"Iuml", "\u00CF"},
                {"Ocirc", "\u00D4"}, {"Ouml", "\u00D6"}, {"OElig", "\u0152"}, {"Ugrave", "\u00D9"}, {"Ucirc", "\u00DB"}, {"Uuml", "\u00DC"},
                {"Yuml", "\u0178"},
                {"laquo", "\u00AB"}, {"raquo", "\u00BB"}, {"lsquo", "\u2018"}, {"rsquo", "\u2019"}, {"ldquo", "\u201C"}, {"rdquo", "\u201D"},
                {"hellip", "\u2026"}, {"ndash", "\u2013"}, {"mdash", "\u2014"}, {"euro", "\u20AC"}, {"deg", "\u00B0"}
        };
        for (String[] entity : accented) entities.put(entity[0], entity[1]);
        return Collections.unmodifiableMap(entities);
    }

    private static String firstNonEmpty(String first, String second) {
        if (first != null && !first.trim().isEmpty()) return first;
        return second != null && !second.trim().isEmpty() ? second : null;
    }
}
