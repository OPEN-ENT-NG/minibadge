package fr.openent.minibadge.controller;

import fr.openent.minibadge.Minibadge;
import fr.openent.minibadge.core.constants.Actions;
import fr.openent.minibadge.core.constants.EventBusConst;
import fr.openent.minibadge.core.constants.Request;
import fr.openent.minibadge.core.constants.Rights;
import fr.openent.minibadge.security.AdminRight;
import fr.openent.minibadge.security.ReceiveRight;
import fr.openent.minibadge.service.BadgeService;
import fr.openent.minibadge.service.NotifyService;
import fr.openent.minibadge.service.ServiceRegistry;
import fr.openent.minibadge.service.UserService;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import fr.wseduc.rs.Put;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import fr.wseduc.webutils.I18n;
import fr.wseduc.webutils.http.Renders;
import fr.wseduc.webutils.request.RequestUtils;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.events.EventStore;
import org.entcore.common.events.EventStoreFactory;
import org.entcore.common.http.filter.ResourceFilter;
import org.entcore.common.http.filter.Trace;
import org.entcore.common.user.UserUtils;

import java.util.List;

import static fr.openent.minibadge.core.constants.Field.*;

public class MinibadgeController extends ControllerHelper {

    private final EventStore eventStore = EventStoreFactory.getFactory().getEventStore(Minibadge.class.getSimpleName());
    private final BadgeService badgeService = ServiceRegistry.getService(BadgeService.class);
    private final UserService userService = ServiceRegistry.getService(UserService.class);
    private final NotifyService notifyService = ServiceRegistry.getService(NotifyService.class);

    @Get("")
    @ApiDoc("Render view")
    @SecuredAction(Rights.VIEW)
    public void view(HttpServerRequest request) {
        renderView(request, new JsonObject());

        eventStore.createAndStoreEvent(EventBusConst.ACCESS_EVENT, request);
    }

    @Put("/accept")
    @ApiDoc("Accept Minibadge module. enable badges assigned status for current user")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ReceiveRight.class)
    @Trace(value = Actions.CHART_ACCEPT, body = false)
    public void acceptBadge(HttpServerRequest request) {
        UserUtils.getUserInfos(eb, request, user -> badgeService.enableBadges(user.getUserId())
                .onSuccess(badge -> renderJson(request, new JsonObject()))
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }

    @Put("/refuse")
    @ApiDoc("Refuse Minibadge module. disable badges assigned status for current user")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ReceiveRight.class)
    @Trace(value = Actions.CHART_REFUSE, body = false)
    public void refuseMinibadge(HttpServerRequest request) {
        String host = Renders.getHost(request);
        String language = I18n.acceptLanguage(request);
        UserUtils.getUserInfos(eb, request, user -> badgeService.disableBadges(user.getUserId(),host,language)
                .onSuccess(badge -> renderJson(request, new JsonObject()))
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }

    @Put("/revoke")
    @ApiDoc("Revoke users Minibadge rights. Admin action")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(AdminRight.class)
    public void revokeUsersMinibadge(HttpServerRequest request) {
        RequestUtils.bodyToJson(request, body -> {
            JsonArray userIdsArray = body.getJsonArray(USERIDS, new JsonArray());
            if (userIdsArray.isEmpty()) {
                renderError(request, new JsonObject().put(Request.MESSAGE, "No user ids provided"));
                return;
            }
            List<String> userIds = userIdsArray.getList();
            userService.removeMinibadgePreferencesForUsers(userIds)
                    .compose(v -> userService.revokeUsersMinibadgeConsent(userIds, request))
                    .compose(v -> UserUtils.getAuthenticatedUserInfos(eb,request))
                    .onSuccess(user -> {
                        notifyService.notifyRevokeUsers(request, user, userIds);
                        renderJson(request, new JsonObject());
                    })
                    .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage())));
        });
    }
}
