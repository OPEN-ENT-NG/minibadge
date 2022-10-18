package fr.cgi.minibadge.controller;

import fr.cgi.minibadge.core.constants.Rights;
import fr.wseduc.rs.Get;
import fr.wseduc.security.SecuredAction;
import io.vertx.core.http.HttpServerRequest;
import org.entcore.common.controller.ControllerHelper;

public class FakeRight extends ControllerHelper {

    public FakeRight() {
        super();
    }

    private void notImplemented(HttpServerRequest request) {
        request.response().setStatusCode(501).end();
    }

    @Get("/rights/assign")
    @SecuredAction(Rights.ASSIGN)
    public void assign(HttpServerRequest request) {
        notImplemented(request);
    }

    @Get("/rights/receive")
    @SecuredAction(Rights.RECEIVE)
    public void receive(HttpServerRequest request) {
        notImplemented(request);
    }
}
