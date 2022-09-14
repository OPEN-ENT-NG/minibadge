package fr.cgi.minibadge.controller;

import fr.cgi.minibadge.core.constants.Database;
import fr.cgi.minibadge.core.constants.Request;
import fr.cgi.minibadge.helper.RequestHelper;
import fr.cgi.minibadge.service.BadgeTypeService;
import fr.cgi.minibadge.service.ServiceFactory;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import fr.wseduc.webutils.I18n;
import fr.wseduc.webutils.http.Renders;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.user.UserUtils;

public class BadgeTypeController extends ControllerHelper {

    private final BadgeTypeService badgeTypeService;

    public BadgeTypeController(ServiceFactory serviceFactory) {
        super();
        this.badgeTypeService = serviceFactory.badgeTypeService();
    }

    @Get("/types")
    @ApiDoc("Retrieve badge type list")
    public void getBadgeTypes(HttpServerRequest request) {
        Integer offset = Integer.parseInt(request.params().get(Request.OFFSET));
        int limit = RequestHelper.cappingLimit(request.params());
        String query = request.params().get(Request.QUERY);

        UserUtils.getUserInfos(eb, request, user -> badgeTypeService.getBadgeTypes(user.getStructures(), query, limit, offset)
                .onSuccess(badgeTypes -> renderJson(request, RequestHelper.formatResponse(limit, offset, badgeTypes)))
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }

    @Get("/types/:typeId")
    @ApiDoc("Retrieve badge type")
    public void getBadgeType(HttpServerRequest request) {
        long typeId = Long.parseLong(request.params().get(Database.TYPEID));
        String host = Renders.getHost(request);
        String language = I18n.acceptLanguage(request);

        UserUtils.getUserInfos(eb, request, user -> badgeTypeService.getBadgeType(user.getStructures(), typeId, host, language)
                .onSuccess(badgeType -> renderJson(request, badgeType.toJson()))
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }
}
