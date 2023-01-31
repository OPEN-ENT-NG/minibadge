package fr.openent.minibadge.controller;

import fr.openent.minibadge.core.constants.Request;
import fr.openent.minibadge.security.ViewRight;
import fr.openent.minibadge.service.ServiceFactory;
import fr.openent.minibadge.service.SettingService;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.http.filter.ResourceFilter;
import org.entcore.common.user.UserUtils;

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
        UserUtils.getUserInfos(eb, request, user -> settingService.getGlobalSettings(user)
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage())))
                .onSuccess(globalSettings -> renderJson(request, globalSettings.toJson())));
    }
}
