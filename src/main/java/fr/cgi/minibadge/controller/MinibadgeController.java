package fr.cgi.minibadge.controller;

import fr.cgi.minibadge.core.constants.Request;
import fr.cgi.minibadge.core.constants.Rights;
import fr.cgi.minibadge.security.ReceiveRight;
import fr.cgi.minibadge.service.BadgeService;
import fr.cgi.minibadge.service.ServiceFactory;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import fr.wseduc.rs.Put;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.events.EventStore;
import org.entcore.common.events.EventStoreFactory;
import org.entcore.common.http.filter.ResourceFilter;
import org.entcore.common.user.UserUtils;

public class MinibadgeController extends ControllerHelper {

    private final EventStore eventStore;
    private final BadgeService badgeService;

    public MinibadgeController(ServiceFactory serviceFactory) {
        this.eventStore = EventStoreFactory.getFactory().getEventStore(fr.cgi.minibadge.Minibadge.class.getSimpleName());
        this.badgeService = serviceFactory.badgeService();
    }

    @Get("")
    @ApiDoc("Render view")
    @SecuredAction(Rights.VIEW)
    public void view(HttpServerRequest request) {
        renderView(request, new JsonObject());

        eventStore.createAndStoreEvent("ACCESS", request);
    }

    @Put("/accept")
    @ApiDoc("Accept Minibadge module. enable badges assigned status for current user")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ReceiveRight.class)
    public void acceptBadge(HttpServerRequest request) {
        UserUtils.getUserInfos(eb, request, user -> badgeService.enableBadges(user.getUserId())
                .onSuccess(badge -> renderJson(request, new JsonObject()))
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }

    @Put("/refuse")
    @ApiDoc("Refuse Minibadge module. disable badges assigned status for current user")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(ReceiveRight.class)
    public void refuseMinibadge(HttpServerRequest request) {
        UserUtils.getUserInfos(eb, request, user -> badgeService.disableBadges(user.getUserId())
                .onSuccess(badge -> renderJson(request, new JsonObject()))
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }
}
