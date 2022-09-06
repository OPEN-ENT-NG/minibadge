package fr.cgi.minibadge.controller;

import fr.cgi.minibadge.core.constants.Database;
import fr.cgi.minibadge.core.constants.Request;
import fr.cgi.minibadge.helper.RequestHelper;
import fr.cgi.minibadge.service.BadgeTypeService;
import fr.cgi.minibadge.service.ServiceFactory;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;

public class BadgeTypeController extends ControllerHelper {

    private final BadgeTypeService badgeTypeService;

    public BadgeTypeController(ServiceFactory serviceFactory) {
        super();
        this.badgeTypeService = serviceFactory.badgeTypeService();
    }

    @Get("/structures/:structureId/types")
    @ApiDoc("Retrieve badge type list")
    public void getBadgeTypes(HttpServerRequest request) {
        String structureId = request.params().get(Database.STRUCTUREID);
        Integer offset = Integer.parseInt(request.params().get(Request.OFFSET));
        int limit = RequestHelper.cappingLimit(request.params());
        String query = request.params().get(Request.QUERY);

        badgeTypeService.getBadgeTypes(structureId, query, limit, offset)
                .onSuccess(badgeTypes -> renderJson(request, RequestHelper.formatResponse(limit, offset, badgeTypes)))
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage())));
    }
}
