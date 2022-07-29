package fr.cgi.minibadge.controller;

import fr.cgi.minibadge.service.ServiceFactory;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import fr.wseduc.security.SecuredAction;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.events.EventStore;
import org.entcore.common.events.EventStoreFactory;

public class MinibadgeController extends ControllerHelper {

    private final EventStore eventStore;

    public MinibadgeController(ServiceFactory serviceFactory) {
        this.eventStore = EventStoreFactory.getFactory().getEventStore(fr.cgi.minibadge.Minibadge.class.getSimpleName());
    }

    @Get("")
    @ApiDoc("Render view")
    @SecuredAction("view")
    public void view(HttpServerRequest request) {
        renderView(request, new JsonObject());

        eventStore.createAndStoreEvent("ACCESS", request);
    }
}
