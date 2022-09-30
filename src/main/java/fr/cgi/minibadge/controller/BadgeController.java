package fr.cgi.minibadge.controller;

import fr.cgi.minibadge.core.constants.Database;
import fr.cgi.minibadge.core.constants.Request;
import fr.cgi.minibadge.model.Model;
import fr.cgi.minibadge.service.BadgeService;
import fr.cgi.minibadge.service.ServiceFactory;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import fr.wseduc.rs.Put;
import fr.wseduc.webutils.I18n;
import fr.wseduc.webutils.http.Renders;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.user.UserUtils;

import java.util.stream.Collectors;

public class BadgeController extends ControllerHelper {

    private final BadgeService badgeService;

    public BadgeController(ServiceFactory serviceFactory) {
        super();
        this.badgeService = serviceFactory.badgeService();
    }

    @Get("/badges")
    @ApiDoc("Retrieve badge list")
    public void getBadges(HttpServerRequest request) {
        String query = request.params().get(Request.QUERY);

        UserUtils.getUserInfos(eb, request, user -> badgeService.getBadges(user.getUserId(), query)
                .onSuccess(badges -> renderJson(request, new JsonObject()
                        .put(Request.ALL, new JsonArray(badges.stream().map(Model::toJson).collect(Collectors.toList()))))
                )
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }

    @Put("/types/:typeId/badge/privatize")
    @ApiDoc("Privatize badge from type and current user")
    public void privatizeBadge(HttpServerRequest request) {
        long typeId = Long.parseLong(request.params().get(Database.TYPEID));

        UserUtils.getUserInfos(eb, request, user -> badgeService.privatizeBadge(user.getUserId(), typeId)
                .onSuccess(badge -> renderJson(request, new JsonObject()))
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }

    @Put("/types/:typeId/badge/refuse")
    @ApiDoc("Refuse badge from type and current user")
    public void refuseBadge(HttpServerRequest request) {
        long typeId = Long.parseLong(request.params().get(Database.TYPEID));

        UserUtils.getUserInfos(eb, request, user -> badgeService.refuseBadge(user.getUserId(), typeId)
                .onSuccess(badge -> renderJson(request, new JsonObject()))
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }
}
