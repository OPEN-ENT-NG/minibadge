package fr.cgi.minibadge.service.impl;

import fr.cgi.minibadge.core.constants.Database;
import fr.cgi.minibadge.core.constants.Field;
import fr.cgi.minibadge.core.constants.Rights;
import fr.cgi.minibadge.helper.Neo4jHelper;
import fr.cgi.minibadge.model.User;
import fr.cgi.minibadge.service.UserService;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.user.UserUtils;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public class DefaultUserService implements UserService {

    private final EventBus eb;

    public DefaultUserService(EventBus eb) {
        this.eb = eb;
    }

    @Override
    @SuppressWarnings("unchecked")
    public Future<List<User>> search(HttpServerRequest request, String query) {
        Promise<List<User>> promise = Promise.promise();
        searchRequest(request, query)
                .onFailure(promise::fail)
                .onSuccess(users -> promise.complete(new User().toList(users)
                        .stream().filter(user -> user.permissions().acceptChart() != null
                                && user.permissions().acceptReceive() != null).collect(Collectors.toList())));

        return promise.future();
    }

    private Future<JsonArray> searchRequest(HttpServerRequest request, String query) {
        Promise<JsonArray> promise = Promise.promise();
        JsonObject params = new JsonObject();

        String preFilter = Neo4jHelper.searchQueryInColumns(query,
                Arrays.asList(String.format("m.%s", Field.FIRSTNAME), String.format("m.%s", Field.LASTNAME)),
                params);

        String userAlias = "visibles";
        String prefAlias = "uac";
        String customReturn = String.format(" %s RETURN distinct visibles.id as id, visibles.lastName as lastName, " +
                        "visibles.firstName as firstName, uac.%s as permissions ",
                Neo4jHelper.matchUsersWithPreferences(userAlias, prefAlias, Database.MINIBADGECHART,
                        Neo4jHelper.usersNodeHasRight(Rights.FULLNAME_RECEIVE, params)),
                Database.MINIBADGECHART);

        UserUtils.findVisibleUsers(eb, request, false, true,
                String.format(" %s %s ", (query != null && !query.isEmpty()) ? "AND" : "", preFilter),
                customReturn, params, promise::complete);

        return promise.future();
    }
}
