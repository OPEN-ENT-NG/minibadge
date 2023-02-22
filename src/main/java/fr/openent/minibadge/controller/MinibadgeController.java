package fr.openent.minibadge.controller;

import fr.openent.minibadge.Minibadge;
import fr.openent.minibadge.core.constants.Actions;
import fr.openent.minibadge.core.constants.EventBusConst;
import fr.openent.minibadge.core.constants.Request;
import fr.openent.minibadge.core.constants.Rights;
import fr.openent.minibadge.security.ReceiveRight;
import fr.openent.minibadge.service.BadgeService;
import fr.openent.minibadge.service.ServiceFactory;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import fr.wseduc.rs.Put;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import fr.wseduc.webutils.I18n;
import fr.wseduc.webutils.http.Renders;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.events.EventStore;
import org.entcore.common.events.EventStoreFactory;
import org.entcore.common.http.filter.ResourceFilter;
import org.entcore.common.http.filter.Trace;
import org.entcore.common.user.UserUtils;

public class MinibadgeController extends ControllerHelper {

    private final EventStore eventStore;
    private final BadgeService badgeService;

    public MinibadgeController(ServiceFactory serviceFactory) {
        this.eventStore = EventStoreFactory.getFactory().getEventStore(Minibadge.class.getSimpleName());
        this.badgeService = serviceFactory.badgeService();
    }

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
}
