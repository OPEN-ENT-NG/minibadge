package fr.openent.minibadge.controller;

import fr.openent.minibadge.core.constants.Actions;
import fr.openent.minibadge.core.constants.Database;
import fr.openent.minibadge.core.constants.Request;
import fr.openent.minibadge.helper.RequestHelper;
import fr.openent.minibadge.security.ViewRight;
import fr.openent.minibadge.service.BadgeService;
import fr.openent.minibadge.service.ServiceRegistry;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import fr.wseduc.rs.Put;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.http.filter.ResourceFilter;
import org.entcore.common.http.filter.Trace;
import org.entcore.common.user.UserUtils;

public class BadgeController extends ControllerHelper {

    private final BadgeService badgeService = ServiceRegistry.getService(BadgeService.class);

    @Get("/badges")
    @ApiDoc("Retrieve badge list")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ViewRight.class)
    public void getBadges(HttpServerRequest request) {
        String query = request.params().get(Request.QUERY);

        UserUtils.getUserInfos(eb, request, user -> badgeService.getBadges(user.getUserId(), query)
                .onSuccess(badges -> renderJson(request, RequestHelper.addAllValue(new JsonObject(), badges)))
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }

    @Put("/types/:typeId/badge/publish")
    @ApiDoc("Publish badge from type and current user")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ViewRight.class)
    @Trace(Actions.BADGE_PUBLISH)
    public void publishBadge(HttpServerRequest request) {
        long typeId = Long.parseLong(request.params().get(Database.TYPEID));

        UserUtils.getUserInfos(eb, request, user -> badgeService.publishBadge(user.getUserId(), typeId)
                .onSuccess(badge -> renderJson(request, new JsonObject()))
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }

    @Put("/types/:typeId/badge/privatize")
    @ApiDoc("Privatize badge from type and current user")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ViewRight.class)
    @Trace(Actions.BADGE_PRIVATIZE)
    public void privatizeBadge(HttpServerRequest request) {
        long typeId = Long.parseLong(request.params().get(Database.TYPEID));

        UserUtils.getUserInfos(eb, request, user -> badgeService.privatizeBadge(user.getUserId(), typeId)
                .onSuccess(badge -> renderJson(request, new JsonObject()))
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }

    @Put("/types/:typeId/badge/refuse")
    @ApiDoc("Refuse badge from type and current user")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ViewRight.class)
    @Trace(Actions.BADGE_REFUSE)
    public void refuseBadge(HttpServerRequest request) {
        long typeId = Long.parseLong(request.params().get(Database.TYPEID));

        UserUtils.getUserInfos(eb, request, user -> badgeService.refuseBadge(user.getUserId(), typeId)
                .onSuccess(badge -> renderJson(request, new JsonObject()))
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }
}
