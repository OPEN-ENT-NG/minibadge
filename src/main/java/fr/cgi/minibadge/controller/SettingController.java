package fr.cgi.minibadge.controller;

import fr.cgi.minibadge.security.ViewRight;
import fr.cgi.minibadge.service.ServiceFactory;
import fr.cgi.minibadge.service.SettingService;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import io.vertx.core.http.HttpServerRequest;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.http.filter.ResourceFilter;

public class SettingController extends ControllerHelper {
    private final SettingService settingService;

    public SettingController(ServiceFactory serviceFactory) {
        this.settingService = serviceFactory.settingService();
    }

    @Get("/global-settings")
    @ApiDoc("Get module global settings")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ViewRight.class)
    public void getGlobalSettings(HttpServerRequest request) {
        renderJson(request, settingService.getGlobalSettings().toJson());
    }
}
