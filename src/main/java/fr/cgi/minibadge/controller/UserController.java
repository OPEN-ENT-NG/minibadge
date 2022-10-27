package fr.cgi.minibadge.controller;

import fr.cgi.minibadge.core.constants.Request;
import fr.cgi.minibadge.helper.RequestHelper;
import fr.cgi.minibadge.security.AssignRight;
import fr.cgi.minibadge.service.ServiceFactory;
import fr.cgi.minibadge.service.UserService;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.http.filter.ResourceFilter;

public class UserController extends ControllerHelper {


    private final UserService userService;

    public UserController(ServiceFactory serviceFactory) {
        super();
        this.userService = serviceFactory.userService();
    }

    @Get("/users-search")
    @ApiDoc("Get users from query")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(AssignRight.class)
    public void searchUsers(HttpServerRequest request) {
        String query = request.params().get(Request.QUERY);

        userService.search(request, query)
                .onSuccess(users -> renderJson(request, RequestHelper.addAllValue(new JsonObject(), users)))
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage())));
    }
}
