package fr.cgi.minibadge.service.impl;

import fr.cgi.minibadge.Minibadge;
import fr.cgi.minibadge.core.constants.Database;
import fr.cgi.minibadge.core.constants.EventBusConst;
import fr.cgi.minibadge.core.constants.Field;
import fr.cgi.minibadge.core.constants.Rights;
import fr.cgi.minibadge.helper.Neo4jHelper;
import fr.cgi.minibadge.helper.PromiseHelper;
import fr.cgi.minibadge.model.User;
import fr.cgi.minibadge.service.UserService;
import fr.wseduc.webutils.I18n;
import io.vertx.core.Future;
import io.vertx.core.Handler;
import io.vertx.core.Promise;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;
import org.entcore.common.user.UserInfos;
import org.entcore.common.user.UserUtils;

import java.util.*;
import java.util.stream.Collectors;

import static fr.cgi.minibadge.core.constants.Request.*;
import static fr.wseduc.webutils.Utils.handlerToAsyncHandler;

public class DefaultUserService implements UserService {

    private final EventBus eb;
    private final Logger log = LoggerFactory.getLogger(PromiseHelper.class);
    private final Sql sql;
    public static final String USER_TABLE = String.format("%s.%s", Minibadge.dbSchema, Database.USER);

    public DefaultUserService(Sql sql, EventBus eb) {
        this.sql = sql;
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

    @Override
    public Future<List<User>> getUsers(List<String> userIds) {
        Promise<List<User>> promise = Promise.promise();
        getUsersRequest(userIds)
                .onFailure(promise::fail)
                .onSuccess(users -> promise.complete(new User().toList(users)));
        return promise.future();
    }

    private Future<JsonArray> getUsersRequest(List<String> userIds) {
        Promise<JsonArray> promise = Promise.promise();
        JsonObject action = new JsonObject()
                .put(EventBusConst.ACTION, EventBusConst.LIST_USERS)
                .put(Field.USERIDS, userIds);
        eb.request(EventBusConst.DIRECTORY, action, PromiseHelper.messageHandler(promise,
                "[Minibadge@%s::getUsersRequest] Fail to retrieve users from eventBus"));
        return promise.future();
    }

    @Override
    public Future<Void> upsert(List<String> usersIds) {
        Promise<Void> promise = Promise.promise();
        Set<String> distinctUsersIds = new HashSet<>(usersIds);
        usersIds = new ArrayList<>(distinctUsersIds);

        getUsers(usersIds).onSuccess(users -> {
            JsonArray statements = new JsonArray(users.stream().map(this::upsertStatement).collect(Collectors.toList()));
            sql.transaction(statements, PromiseHelper.messageToPromise(promise));
        });
        return promise.future();
    }

    @Override
    public Future<JsonArray> anonimyzeUser(String userId, String host, String language) {
        Promise<JsonArray> promise = Promise.promise();
        String query = String.format("UPDATE %s set display_name = ?" +
                " WHERE id = ? ; ", USER_TABLE);
        JsonArray params = new JsonArray();
        params.add(I18n.getInstance().translate("minibadge.disable.user", host, language))
                .add(userId);

        sql.prepared(query, params, SqlResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::createBadgeAssignedRequest] Fail to create badge assigned",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

    private JsonObject upsertStatement(User user) {
        String statement = String.format(" INSERT INTO %s (id , display_name ) " +
                " VALUES ( ? , ?) ON CONFLICT (id) DO UPDATE SET display_name = ?" +
                "  WHERE %s.id = EXCLUDED.id ;", USER_TABLE, USER_TABLE);
        JsonArray params = new JsonArray()
                .add(user.getUserId())
                .add(user.getUsername())
                .add(user.getUsername());

        return new JsonObject()
                .put("statement", statement)
                .put("values", params)
                .put("action", "prepared");
    }
}
