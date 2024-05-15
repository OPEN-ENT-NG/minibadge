package fr.openent.minibadge.controller;

import fr.openent.minibadge.Minibadge;
import fr.openent.minibadge.core.constants.Database;
import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.core.constants.Request;
import fr.openent.minibadge.helper.RequestHelper;
import fr.openent.minibadge.model.User;
import fr.openent.minibadge.security.ReceiveRight;
import fr.openent.minibadge.security.ViewRight;
import fr.openent.minibadge.service.BadgeAssignedService;
import fr.openent.minibadge.service.BadgeService;
import fr.openent.minibadge.service.BadgeTypeService;
import fr.openent.minibadge.service.impl.ServiceFactory;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import fr.wseduc.webutils.I18n;
import fr.wseduc.webutils.http.Renders;
import io.vertx.core.Future;
import io.vertx.core.MultiMap;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.http.filter.ResourceFilter;
import org.entcore.common.user.UserUtils;

import java.util.List;

public class BadgeTypeController extends ControllerHelper {

    private final BadgeTypeService badgeTypeService;
    private final BadgeAssignedService badgeAssignedService;
    private final BadgeService badgeService;

    public BadgeTypeController(ServiceFactory serviceFactory) {
        super();
        this.badgeTypeService = serviceFactory.badgeTypeService();
        this.badgeAssignedService = serviceFactory.badgeAssignedService();
        this.badgeService = serviceFactory.badgeService();
    }

    @Get("/types")
    @ApiDoc("Retrieve badge type list")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ViewRight.class)
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
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ViewRight.class)
    public void getBadgeType(HttpServerRequest request) {
        long typeId = Long.parseLong(request.params().get(Database.TYPEID));
        String host = Renders.getHost(request);
        String language = I18n.acceptLanguage(request);

        UserUtils.getUserInfos(eb, request, user -> badgeTypeService.getBadgeType(user.getStructures(), typeId, host, language)
                .onSuccess(badgeType -> renderJson(request, badgeType.toJson()))
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }

    @Get("/types/:typeId/assigners")
    @ApiDoc("Get users that gave me this (:typeId) badge typed")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ReceiveRight.class)
    public void getBadgeTypeAssigners(HttpServerRequest request) {
        MultiMap params = request.params();
        int page = params.contains(Request.PAGE) ? Integer.parseInt(params.get(Request.PAGE)) : 0;
        int limit = RequestHelper.cappingLimit(params, Minibadge.modelConfig.typeListsUsersSize());
        int offset = RequestHelper.pageToOffset(page, limit);
        long typeId = Long.parseLong(params.get(Database.TYPEID));

        UserUtils.getUserInfos(eb, request, user -> {
            Future<List<User>> assignersFuture = badgeAssignedService.getBadgeTypeAssigners(typeId, user, limit, offset);
            Future<Integer> countAssignersFuture = badgeAssignedService.countTotalAssigners(typeId, user);

            Future.all(assignersFuture, countAssignersFuture)
                    .onSuccess(users -> {
                        JsonObject response = RequestHelper.formatResponse(page, countAssignersFuture.result(), limit,
                                assignersFuture.result());
                        response.put(Field.USERASSIGNERSTOTAL, countAssignersFuture.result());
                        renderJson(request, response);
                    })
                    .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage())));
        });

    }

    @Get("/types/:typeId/receivers")
    @ApiDoc("Get users that received this (:typeId) badge typed")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ViewRight.class)
    public void getBadgeTypeReceivers(HttpServerRequest request) {
        MultiMap params = request.params();
        int page = params.contains(Request.PAGE) ? Integer.parseInt(params.get(Request.PAGE)) : 0;
        int limit = RequestHelper.cappingLimit(params, Minibadge.modelConfig.typeListsUsersSize());
        int offset = RequestHelper.pageToOffset(page, limit);
        long typeId = Long.parseLong(params.get(Database.TYPEID));

        Future<List<User>> receiversFuture = badgeService.getBadgeTypeReceivers(typeId, limit, offset);
        Future<Integer> countReceiversFuture = badgeService.countTotalReceivers(typeId);

        UserUtils.getUserInfos(eb, request, user -> Future.all(receiversFuture, countReceiversFuture)
                .onSuccess(users -> {
                    JsonObject response = RequestHelper.formatResponse(page, countReceiversFuture.result(), limit,
                            receiversFuture.result());
                    response.put(Field.RECEIVERSTOTAL, countReceiversFuture.result());
                    renderJson(request, response);
                })
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }


}
