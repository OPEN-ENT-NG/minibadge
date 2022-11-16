package fr.cgi.minibadge.service.impl;

import fr.cgi.minibadge.Minibadge;
import fr.cgi.minibadge.core.constants.Database;
import fr.cgi.minibadge.core.constants.EventBusConst;
import fr.cgi.minibadge.core.constants.Field;
import fr.cgi.minibadge.core.constants.Rights;
import fr.cgi.minibadge.helper.Neo4jHelper;
import fr.cgi.minibadge.helper.PromiseHelper;
import fr.cgi.minibadge.helper.SettingHelper;
import fr.cgi.minibadge.model.User;
import fr.cgi.minibadge.service.UserService;
import fr.wseduc.webutils.I18n;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;
import org.entcore.common.user.UserInfos;
import org.entcore.common.user.UserUtils;

import java.util.*;
import java.util.stream.Collectors;

import static fr.cgi.minibadge.service.impl.DefaultBadgeService.BADGE_TABLE;

public class DefaultUserService implements UserService {

    public static final String USER_TABLE = String.format("%s.%s", Minibadge.dbSchema, Database.USER);
    private final EventBus eb;
    private final Sql sql;

    public DefaultUserService(Sql sql, EventBus eb) {
        this.sql = sql;
        this.eb = eb;
    }

    @Override
    public Future<List<User>> search(HttpServerRequest request, UserInfos user, Long typeId, String query) {
        Promise<List<User>> promise = Promise.promise();

        List<User> users = new ArrayList<>();
        searchRequest(request, query)
                .compose(queriedUsers -> {
                    users.addAll(mapToAuthorizedAssignUsers(user, queriedUsers));
                    return getAlreadyTypedAssignedFromUser(typeId, user,
                            users.stream().map(User::getUserId).collect(Collectors.toList()));
                })
                .onFailure(promise::fail)
                .onSuccess(receivedUsers -> promise.complete(filterUsersNotAssignedYet(users, receivedUsers)));

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
                        "visibles.firstName as firstName, uac.%s as permissions, profile.name as type  ",
                Neo4jHelper.matchUsersWithPreferences(userAlias, prefAlias, Database.MINIBADGECHART,
                        Neo4jHelper.usersNodeHasRight(Rights.FULLNAME_RECEIVE, params)),
                Database.MINIBADGECHART);

        UserUtils.findVisibleUsers(eb, request, false, true,
                String.format(" %s %s ", (query != null && !query.isEmpty()) ? "AND" : "", preFilter),
                customReturn, params, promise::complete);

        return promise.future();
    }

    private List<User> mapToAuthorizedAssignUsers(UserInfos user, JsonArray users) {
        return new User().toList(users)
                .stream().filter(queriedUser ->
                        queriedUser.permissions().acceptChart() == null
                                || queriedUser.permissions().acceptReceive() != null
                                // We currently consider that all types have default setting
                                && SettingHelper.isAuthorizedToAssign(new User(user), queriedUser,
                                SettingHelper.getDefaultTypeSetting())
                )
                .collect(Collectors.toList());
    }

    @Override
    public Future<List<User>> getAlreadyTypedAssignedFromUser(long typeId, UserInfos assigner,
                                                              List<String> receiverIds) {
        Promise<List<User>> promise = Promise.promise();

        getAlreadyTypedAssignedFromUserRequest(typeId, assigner, receiverIds)
                .onSuccess(users -> promise.complete(new User().toList(users)))
                .onFailure(promise::fail);

        return promise.future();
    }

    private Future<JsonArray> getAlreadyTypedAssignedFromUserRequest(long typeId, UserInfos assigner,
                                                                     List<String> receiverIds) {
        if (receiverIds == null || receiverIds.isEmpty()) return Future.succeededFuture(new JsonArray());

        Promise<JsonArray> promise = Promise.promise();
        JsonArray params = new JsonArray()
                .add(assigner.getUserId())
                .add(typeId)
                .addAll(new JsonArray(receiverIds));

        String request = String.format(" SELECT DISTINCT(owner_id) as id " +
                        " FROM %s bav INNER JOIN %s b on b.id = bav.badge_id " +
                        " WHERE assignor_id = ? AND badge_type_id = ?  AND owner_id IN %s",
                DefaultBadgeAssignedService.BADGE_ASSIGNED_VALID_TABLE, BADGE_TABLE, Sql.listPrepared(receiverIds));

        sql.prepared(request, params,
                SqlResult.validResultHandler(PromiseHelper.handler(promise,
                        String.format("[Minibadge@%s::getAlreadyTypedAssignedFromUserRequest] " +
                                        "Fail to retrieve already assigned users",
                                this.getClass().getSimpleName()))));

        return promise.future();
    }

    private List<User> filterUsersNotAssignedYet(List<User> allUsers, List<User> receivedUsers) {
        return allUsers.stream().filter(queriedUser ->
                receivedUsers.stream()
                        .noneMatch(receivedUser -> queriedUser.getUserId().equals(receivedUser.getUserId()))
        ).collect(Collectors.toList());
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
        String statement = String.format(" INSERT INTO %s (id , display_name) " +
                " VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET display_name = ? " +
                "  WHERE %s.id = EXCLUDED.id;", USER_TABLE, USER_TABLE);
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
