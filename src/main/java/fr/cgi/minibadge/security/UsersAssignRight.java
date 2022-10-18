package fr.cgi.minibadge.security;

import fr.cgi.minibadge.core.constants.Database;
import fr.cgi.minibadge.core.constants.Field;
import fr.cgi.minibadge.core.constants.Request;
import fr.cgi.minibadge.core.constants.Rights;
import fr.cgi.minibadge.helper.Neo4jHelper;
import fr.cgi.minibadge.helper.PromiseHelper;
import fr.cgi.minibadge.helper.WorkflowHelper;
import fr.cgi.minibadge.model.Chart;
import fr.cgi.minibadge.model.User;
import fr.wseduc.webutils.Server;
import fr.wseduc.webutils.http.Binding;
import fr.wseduc.webutils.request.RequestUtils;
import io.vertx.core.Future;
import io.vertx.core.Handler;
import io.vertx.core.Promise;
import io.vertx.core.Vertx;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import org.entcore.common.http.filter.ResourcesProvider;
import org.entcore.common.neo4j.Neo4j;
import org.entcore.common.neo4j.Neo4jResult;
import org.entcore.common.user.UserInfos;
import org.entcore.common.user.UserUtils;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public class UsersAssignRight implements ResourcesProvider {
    private static final List<String> PERMISSIONS_FIELDS = Arrays.asList(Field.ACCEPTCHART, Field.ACCEPTASSIGN,
            Field.ACCEPTRECEIVE);
    private final Logger log = LoggerFactory.getLogger(UsersAssignRight.class);

    @Override
    @SuppressWarnings("unchecked")
    public void authorize(HttpServerRequest request, Binding binding, UserInfos userInfos, Handler<Boolean> handler) {
        if (!WorkflowHelper.hasRight(userInfos, Rights.ASSIGN)) {
            handler.handle(false);
            return;
        }

        request.pause();
        RequestUtils.bodyToJson(request, body -> {
            request.resume();
            List<String> ownerIds = body.getJsonArray(Field.OWNERIDS).getList();
            getUserCachedPermissions(request)
                    .compose(cachedPermissions -> getUserPermissions(cachedPermissions, userInfos, request))
                    .compose(permissions -> {
                        if (permissions.acceptChart() == null)
                            return Future.failedFuture(
                                    String.format("[Minibadge@%s::authorize] User is not allowed to assign.",
                                            this.getClass().getSimpleName()));

                        return this.getUsers(request, ownerIds);
                    })
                    .onSuccess(usersArray -> {
                        List<User> users = new User().toList(usersArray);
                        boolean canUsersReceive = users.stream()
                                .allMatch(user ->
                                        user.permissions().acceptChart() != null
                                                && user.permissions().acceptReceive() != null);
                        handler.handle(ownerIds.size() == users.size() && canUsersReceive);
                    })
                    .onFailure(err -> handler.handle(false));
        });
    }

    private Future<JsonObject> getUserCachedPermissions(final HttpServerRequest request) {
        Promise<JsonObject> promise = Promise.promise();
        request.pause();
        UserUtils.getSession(Server.getEventBus(Vertx.currentContext().owner()), request, session -> {
            request.resume();
            promise.complete(new JsonObject(session.getJsonObject(Request.CACHE, new JsonObject())
                    .getJsonObject(Request.PREFERENCES, new JsonObject())
                    .getString(Database.MINIBADGECHART, "{}")));
        });
        return promise.future();
    }

    private Future<Chart> getUserPermissions(JsonObject cachePermission, final UserInfos user, final HttpServerRequest request) {
        JsonObject permissions = new JsonObject();
        return PERMISSIONS_FIELDS.stream()
                .map(field -> setPermissionsFromCache(cachePermission, permissions, field))
                .filter(isSetFromCache -> isSetFromCache)
                .collect(Collectors.toList())
                .stream()
                .findAny()
                .map(isSetFromCache -> Future.succeededFuture(new Chart(permissions)))
                .orElseGet(() -> getAndCachePermissionsPreferences(user, request));
    }

    private Future<JsonArray> getUsers(HttpServerRequest request, List<String> ownerIds) {
        Promise<JsonArray> promise = Promise.promise();
        JsonObject params = new JsonObject();
        String preFilter = Neo4jHelper.filterUsersFromIds(ownerIds, "m", params);

        String userAlias = "visibles";
        String prefAlias = "uac";
        String customReturn = String.format(" %s RETURN distinct %s.id as id, %s.%s as permissions ",
                Neo4jHelper.matchUsersWithPreferences(userAlias, prefAlias, Database.MINIBADGECHART,
                        Neo4jHelper.usersNodeHasRight(Rights.FULLNAME_RECEIVE, params)),
                userAlias, prefAlias, Database.MINIBADGECHART);

        UserUtils.findVisibleUsers(Server.getEventBus(Vertx.currentContext().owner()), request, false, true,
                String.format(" %s %s ", "AND", preFilter),
                customReturn, params, promise::complete);

        return promise.future();
    }

    private boolean setPermissionsFromCache(JsonObject cache, JsonObject permissions, String key) {
        if (cache.containsKey(key)) {
            permissions.put(key, cache.getString(key));
            return true;
        }
        return false;
    }

    private Future<Chart> getAndCachePermissionsPreferences(final UserInfos user, HttpServerRequest request) {
        Promise<Chart> promise = Promise.promise();

        this.getUserPreferences(user, request)
                .onSuccess(preferences -> {
                    UserUtils.addSessionAttribute(Server.getEventBus(Vertx.currentContext().owner()),
                            user.getUserId(), Request.PREFERENCES, preferences.getJsonObject(Request.PREFERENCES,
                                    new JsonObject()).toString(), null);

                    promise.complete(new Chart(new JsonObject(preferences.getJsonObject(Request.PREFERENCES,
                                    new JsonObject())
                            .getString(Database.MINIBADGECHART, "{}"))));
                })
                .onFailure(err -> {
                    log.error(
                            String.format("[Minibadge@%s::getAndCachePermissionsPreferences] Fail to store " +
                                            "permissions preferences to session. %s",
                                    this.getClass().getSimpleName(), err.getMessage()));
                    promise.fail(err);
                });
        return promise.future();
    }

    private Future<JsonObject> getUserPreferences(final UserInfos user, HttpServerRequest request) {
        Promise<JsonObject> promise = Promise.promise();
        request.pause();
        JsonObject params = new JsonObject();
        Neo4j.getInstance().execute(Neo4jHelper.matchUserPreferencesRequest(user, params), params,
                Neo4jResult.validUniqueResultHandler(PromiseHelper.handler(promise, request,
                        String.format("[Minibadge@%s::getUserPreferences] Fail to get permissions.",
                                this.getClass().getSimpleName()))));

        return promise.future();
    }
}
