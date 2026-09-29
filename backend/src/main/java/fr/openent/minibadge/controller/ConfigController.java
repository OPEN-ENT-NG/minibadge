package fr.openent.minibadge.controller;

import fr.openent.minibadge.service.impl.DefaultPdfExportService;
import fr.wseduc.rs.Get;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.http.filter.AdminFilter;
import org.entcore.common.http.filter.ResourceFilter;

public class ConfigController extends ControllerHelper {

    static final String MASK = "**********";

    @Get("/config")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(AdminFilter.class)
    public void getConfig(final HttpServerRequest request) {
        renderJson(request, safeConfig(config));
    }

    /**
     * Epic D: a copy of the configuration with the PDF service token masked (the original is left untouched).
     * A {@code node-pdf-generator} value that is not an object (e.g. a JSON string holding the token) is
     * masked as a whole.
     */
    static JsonObject safeConfig(JsonObject config) {
        JsonObject safeConfig = config.copy();
        if (!safeConfig.containsKey(DefaultPdfExportService.NODE_PDF_GENERATOR)) {
            return safeConfig;
        }
        Object nodePdfGenerator = safeConfig.getValue(DefaultPdfExportService.NODE_PDF_GENERATOR);
        if (!(nodePdfGenerator instanceof JsonObject)) {
            if (nodePdfGenerator != null) safeConfig.put(DefaultPdfExportService.NODE_PDF_GENERATOR, MASK);
        } else if (((JsonObject) nodePdfGenerator).getValue(DefaultPdfExportService.AUTH) != null) {
            ((JsonObject) nodePdfGenerator).put(DefaultPdfExportService.AUTH, MASK);
        }
        return safeConfig;
    }
}
