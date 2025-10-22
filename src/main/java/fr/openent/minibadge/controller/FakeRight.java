package fr.openent.minibadge.controller;

import fr.openent.minibadge.core.constants.Rights;
import fr.wseduc.rs.Get;
import fr.wseduc.security.SecuredAction;
import io.vertx.core.http.HttpServerRequest;
import org.entcore.common.controller.ControllerHelper;

public class FakeRight extends ControllerHelper {

    public FakeRight() {
        super();
    }

    @SecuredAction(Rights.ASSIGN)
    public void assign(HttpServerRequest request) {}

    @SecuredAction(Rights.RECEIVE)
    public void receive(HttpServerRequest request) {}

    @SecuredAction(Rights.STATISTICS_VIEW)
    public void statisticsView(HttpServerRequest request) {}

    @SecuredAction(Rights.STATISTICS_VIEW_ALL_STRUCTURES)
    public void statisticsViewAllStructures(HttpServerRequest request) {}

    @SecuredAction(Rights.ADMIN)
    public void admin(HttpServerRequest request) {}
}
