package fr.openent.minibadge.service;

import io.vertx.core.Future;
import org.entcore.common.pdf.Pdf;

/**
 * Epic D: access to the platform PDF service ({@code node-pdf-generator}), decided once at startup.
 * <p>
 * {@code PdfFactory} does not fail when that service is not configured: it only throws a synchronous
 * NullPointerException on the first generation. This service therefore decides itself whether the
 * PDF export is available, and never lets a generation throw.
 */
public interface PdfExportService {

    /** Stable failure (doubling as its i18n key) for every PDF export failure, shown to the user. */
    String PDF_UNAVAILABLE_ERROR = "minibadge.error.certificate.unavailable";

    /** @return true when a {@code node-pdf-generator} block with a non-empty url and auth was found at startup. */
    boolean isEnabled();

    /**
     * Sends an XHTML template to the PDF service.
     *
     * @param name     name of the generated PDF
     * @param template well-formed XHTML (sent as application/xml)
     * @return the PDF, or a failed future (never a synchronous exception), including when the export is disabled
     */
    Future<Pdf> generatePdfFromTemplate(String name, String template);
}
