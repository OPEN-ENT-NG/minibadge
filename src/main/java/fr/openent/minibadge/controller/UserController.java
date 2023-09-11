package fr.openent.minibadge.controller;

import fr.openent.minibadge.core.constants.Database;
import fr.openent.minibadge.core.constants.Request;
import fr.openent.minibadge.helper.RequestHelper;
import fr.openent.minibadge.security.AssignRight;
import fr.openent.minibadge.service.impl.ServiceFactory;
import fr.openent.minibadge.service.UserService;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import fr.wseduc.security.ActionType;
import fr.wseduc.security.SecuredAction;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.http.filter.ResourceFilter;
import org.entcore.common.user.UserUtils;

public class UserController extends ControllerHelper {


    private final UserService userService;

    public UserController(ServiceFactory serviceFactory) {
        super();
        this.userService = serviceFactory.userService();
    }

    @Get("type/:typeId/users-search")
    @ApiDoc("Get users from query")
    @SecuredAction(value = "", type = ActionType.RESOURCE)
    @ResourceFilter(AssignRight.class)
    public void searchUsers(HttpServerRequest request) {
        String query = request.params().get(Request.QUERY);
        long typeId = Long.parseLong(request.params().get(Database.TYPEID));

        UserUtils.getUserInfos(eb, request, user -> userService.search(request, user, typeId, query)
                .onSuccess(users -> renderJson(request, RequestHelper.addAllValue(new JsonObject(), users)))
                .onFailure(err -> renderError(request, new JsonObject().put(Request.MESSAGE, err.getMessage()))));
    }
}
