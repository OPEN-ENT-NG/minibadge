package fr.openent.minibadge.controller;

import fr.openent.minibadge.Minibadge;
import fr.openent.minibadge.core.constants.*;
import fr.openent.minibadge.helper.RequestHelper;
import fr.openent.minibadge.security.UsersAssignRight;
import fr.openent.minibadge.security.ViewRight;
import fr.openent.minibadge.service.BadgeAssignedService;
import fr.openent.minibadge.service.NotifyService;
import fr.openent.minibadge.service.ServiceRegistry;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import fr.wseduc.rs.Post;
import fr.wseduc.rs.Put;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import fr.wseduc.webutils.request.RequestUtils;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.events.EventStore;
import org.entcore.common.events.EventStoreFactory;
import org.entcore.common.http.filter.ResourceFilter;
import org.entcore.common.http.filter.Trace;
import org.entcore.common.user.UserUtils;

import java.util.List;

import static fr.openent.minibadge.core.constants.Field.*;

public class BadgeAssignedController extends ControllerHelper {

    private final EventStore eventStore = EventStoreFactory.getFactory().getEventStore(Minibadge.class.getSimpleName());
    private final BadgeAssignedService badgeAssignedService = ServiceRegistry.getService(BadgeAssignedService.class);
    private final NotifyService notifyService = ServiceRegistry.getService(NotifyService.class);

    @Put("/revoked/given/:badgeId")
    @ApiDoc("revoke a badge the user has given")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ViewRight.class)
    @Trace(Actions.BADGE_ASSIGN_REVOKE)
    public void revoke(HttpServerRequest request) {
        long idBadge = Long.parseLong(request.params().get(BADGEID));
        UserUtils.getUserInfos(eb, request, user -> badgeAssignedService.revoke(user.getUserId(), idBadge)
                .onSuccess(event -> request.response().setStatusCode(200).end())
                .onFailure(error -> badRequest(request, error.getMessage())));

    }


    @Get("/assigned/given")
    @ApiDoc("get all the badge the user has given")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ViewRight.class)
    public void get(HttpServerRequest request) {
        String query = request.params().get(Request.QUERY);
        String startDate = request.params().get(Request.START_DATE);
        String endDate = request.params().get(Request.END_DATE);
        String sortType = request.params().get(Request.SORTBY);
        Boolean sortAsc = Boolean.parseBoolean(request.params().get(Request.SORTASC));
        UserUtils.getUserInfos(eb, request, user -> badgeAssignedService.getBadgesGiven(eb, query, startDate, endDate, sortType, sortAsc, user.getUserId())
                .onSuccess(badges -> renderJson(request, RequestHelper.addAllValue(new JsonObject(), badges))
                )
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }

    @Post("/types/:typeId/assign")
    @ApiDoc("Create badge assigned with badge creation if not exists")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(UsersAssignRight.class)
    @Trace(Actions.BADGE_ASSIGN)
    @SuppressWarnings("unchecked")
    public void assign(HttpServerRequest request) {
        long typeId = Long.parseLong(request.params().get(TYPEID));

        RequestUtils.bodyToJson(request, String.format("%s%s", pathPrefix, "badgeAssignedCreate"), body -> {
            List<String> ownerIds = body.getJsonArray(Field.OWNERIDS).getList();
            UserUtils.getUserInfos(eb, request, user -> badgeAssignedService.assign(typeId, ownerIds, user)
                    .onSuccess(badgeType -> {
                        eventStore.createAndStoreEvent(EventBusConst.CREATE_EVENT, request);
                        notifyService.notifyBadgeAssigned(request, user, ownerIds, typeId);
                        renderJson(request, new JsonObject());
                    })
                    .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
        });
    }
}
