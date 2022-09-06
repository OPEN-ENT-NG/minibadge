package fr.cgi.minibadge.controller;

import fr.cgi.minibadge.service.ServiceFactory;
import fr.cgi.minibadge.service.SettingService;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import io.vertx.core.http.HttpServerRequest;
import org.entcore.common.controller.ControllerHelper;

public class SettingController extends ControllerHelper {
    private final SettingService settingService;

    public SettingController(ServiceFactory serviceFactory) {
        this.settingService = serviceFactory.settingService();
    }

    @Get("/global-settings")
    @ApiDoc("Get module global settings")
    public void getGlobalSettings(HttpServerRequest request) {
        renderJson(request, settingService.getGlobalSettings().toJson());
    }
}
