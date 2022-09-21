package fr.cgi.minibadge.controller;

import fr.cgi.minibadge.core.constants.Field;
import fr.cgi.minibadge.core.constants.Request;
import fr.cgi.minibadge.helper.Neo4jHelper;
import fr.cgi.minibadge.model.User;
import fr.wseduc.rs.ApiDoc;
import fr.wseduc.rs.Get;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.controller.ControllerHelper;
import org.entcore.common.user.UserUtils;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public class UserController extends ControllerHelper {


    public UserController() {
        super();
    }

    @Get("/users-search")
    @ApiDoc("Get users from query")
    @SuppressWarnings("unchecked")
    public void searchUsers(HttpServerRequest request) {
        String query = request.params().get(Request.QUERY);
        JsonObject params = new JsonObject();

        String preFilter = Neo4jHelper.searchQueryInColumns(query,
                Arrays.asList(String.format("m.%s", Field.FIRSTNAME), String.format("m.%s", Field.LASTNAME)),
                params);

        UserUtils.findVisibleUsers(eb, request, false, true,
                String.format(" %s %s ", (query != null && !query.isEmpty()) ? "AND" : "", preFilter),
                null, params, users ->
                        renderJson(request, new JsonObject()
                                .put(Request.ALL, new JsonArray(((List<JsonObject>) users.getList())
                                        .stream().map(user -> new User().set(user).toJson())
                                        .collect(Collectors.toList())))));
    }
}
