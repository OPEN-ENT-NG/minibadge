package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.core.constants.Rights;
import fr.openent.minibadge.core.enums.MinibadgeUserState;
import fr.openent.minibadge.core.enums.SqlTable;
import fr.openent.minibadge.helper.*;
import fr.openent.minibadge.model.User;
import fr.openent.minibadge.model.UserMinibadge;
import fr.openent.minibadge.service.UserService;
import fr.wseduc.webutils.I18n;
import fr.wseduc.webutils.Server;
import fr.wseduc.webutils.http.Renders;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.Vertx;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.neo4j.Neo4j;
import org.entcore.common.neo4j.Neo4jResult;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;
import org.entcore.common.user.UserInfos;
import org.entcore.common.user.UserUtils;

import java.util.*;
import java.util.stream.Collectors;

import static fr.openent.minibadge.core.constants.Field.*;

public class DefaultUserService implements UserService {

    private static final UserService instance = new DefaultUserService();
    private DefaultUserService() {}
    public static UserService getInstance() {
        return instance;
    }

    private final Sql sql = Sql.getInstance();
    private final Neo4j neo = Neo4j.getInstance();

    @Override
    public Future<List<User>> search(HttpServerRequest request, UserInfos user, Long typeId, String query) {
        Promise<List<User>> promise = Promise.promise();

        List<User> users = new ArrayList<>();
        searchRequest(request, query)
                .compose(queriedUsers -> {
                    users.addAll(mapToAuthorizedAssignUsers(user, queriedUsers));
                    return getUnassignableUserIds(typeId, user,
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
                Arrays.asList(String.format("m.%s", FIRSTNAME), String.format("m.%s", LASTNAME)),
                params);

        String userAlias = "visibles";
        String prefAlias = "uac";
        String customReturn = String.format(" %s RETURN distinct visibles.id as id, visibles.lastName as lastName, " +
                        "visibles.firstName as firstName, uac.%s as permissions, profile.name as type  ",
                Neo4jHelper.matchUsersWithPreferences(userAlias, prefAlias,
                        Neo4jHelper.usersNodeHasRight(Rights.FULLNAME_RECEIVE, params)),
                MINIBADGECHART);

        UserUtils.findVisibleUsers(Server.getEventBus(Vertx.currentContext().owner()), request, false, true,
                String.format(" %s %s ", (query != null && !query.isEmpty()) ? "AND" : "", preFilter),
                customReturn, params, promise::complete);

        return promise.future();
    }

    private List<User> mapToAuthorizedAssignUsers(UserInfos user, JsonArray users) {
        return new User().toList(users)
                .stream().filter(queriedUser ->
                        queriedUser.permissions().validateChart() == null
                                || queriedUser.permissions().acceptReceive() != null
                                // We currently consider that all types have default setting
                                && SettingHelper.isAuthorizedToAssign(new User(user), queriedUser,
                                SettingHelper.getDefaultTypeSetting())
                )
                .collect(Collectors.toList());
    }

    @Override
    public Future<List<User>> getUnassignableUserIds(long typeId, UserInfos assigner,
                                                     List<String> receiverIds) {
        Promise<List<User>> promise = Promise.promise();

        getUnassignableUserIdsRequest(typeId, assigner, receiverIds)
                .onSuccess(users -> promise.complete(new User().toList(users)))
                .onFailure(promise::fail);

        return promise.future();
    }

    private Future<JsonArray> getUnassignableUserIdsRequest(long typeId, UserInfos assigner,
                                                            List<String> receiverIds) {
        if (receiverIds == null || receiverIds.isEmpty()) return Future.succeededFuture(new JsonArray());

        Promise<JsonArray> promise = Promise.promise();
        JsonArray params = new JsonArray();

        String request = String.format("%s UNION %s",
                getAlreadyOwnerIdTypedAssignedFromUserQuery(typeId, assigner, receiverIds, params),
                getDisabledBadgeOwnerIdsQuery(typeId, receiverIds, params));

        sql.prepared(request, params,
                SqlResult.validResultHandler(PromiseHelper.handler(promise,
                        String.format("[Minibadge@%s::getUnassignableUserIdsRequest] " +
                                        "Fail to retrieve Unassignable user ids",
                                this.getClass().getSimpleName()))));

        return promise.future();
    }

    private String getAlreadyOwnerIdTypedAssignedFromUserQuery(long typeId, UserInfos assigner,
                                                               List<String> receiverIds, JsonArray params) {
        params.add(assigner.getUserId())
                .add(typeId)
                .addAll(new JsonArray(receiverIds));

        return String.format(" SELECT DISTINCT(owner_id) as id " +
                        " FROM %s bav INNER JOIN %s b on b.id = bav.badge_id " +
                        " WHERE assignor_id = ? AND badge_type_id = ? AND owner_id IN %s",
                        SqlTable.BADGE_ASSIGNED_VALID.getName(), SqlTable.BADGE.getName(), Sql.listPrepared(receiverIds));
    }

    private String getDisabledBadgeOwnerIdsQuery(long typeId, List<String> receiverIds, JsonArray params) {
        params.add(typeId)
                .addAll(new JsonArray(receiverIds));

        return String.format(" SELECT DISTINCT(owner_id) as id " +
                        " FROM %s b " +
                        " WHERE badge_type_id = ? AND owner_id IN %s",
                        SqlTable.BADGE_DISABLED.getName(), Sql.listPrepared(receiverIds));
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

        String query =
                "MATCH (u:User) " +
                        "WHERE u.id IN {userIds} " +
                        "OPTIONAL MATCH (u)-[:ADMINISTRATIVE_ATTACHMENT]->(sAdminAttach:Structure) " +
                        "OPTIONAL MATCH (u)-[:IN]->(pg:ProfileGroup)-[:HAS_PROFILE]->(profile:Profile) " +
                        "OPTIONAL MATCH (pg)-[:DEPENDS]->(sProfile:Structure) " +

                        "WITH u, profile, COLLECT(DISTINCT sProfile) + COLLECT(DISTINCT sAdminAttach) AS allStructures " +

                        "WITH u, profile, " +
                        "     [s IN allStructures WHERE s IS NOT NULL | s.id] AS tempIds, " +
                        "     [s IN allStructures WHERE s IS NOT NULL | s.name] AS tempNames " +

                        "UNWIND tempIds AS singleId " +
                        "UNWIND tempNames AS singleName " +
                        "WITH u, profile, COLLECT(DISTINCT singleId) AS structureIds, COLLECT(DISTINCT singleName) AS structureNames " +

                        "RETURN u.id AS id, " +
                        "       u.login AS login, " +
                        "       u.displayName AS username, " +
                        "       profile.name AS type, " +
                        "       structureIds, " +
                        "       structureNames " +
                        "ORDER BY username";

        JsonObject params = new JsonObject().put("userIds", userIds);

        String errorMsg = String.format(
                "[Minibadge@%s::getUsersRequest] Fail to get users",
                this.getClass().getSimpleName()
        );

        neo.execute(
                query,
                params,
                Neo4jResult.validResultHandler(PromiseHelper.handler(promise, errorMsg))
        );

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
                " WHERE id = ? ; ", SqlTable.USER.getName());
        JsonArray params = new JsonArray();
        params.add(I18n.getInstance().translate("minibadge.disable.user", host, language))
                .add(userId);

        sql.prepared(query, params, SqlResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::createBadgeAssignedRequest] Fail to create badge assigned",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

    private JsonObject upsertStatement(User user) {
        String statement = String.format(
                "INSERT INTO %s (id, display_name) " +
                        "VALUES (?, ?) " +
                        "ON CONFLICT (id) DO UPDATE SET display_name = ?, revoked_at = ? " +
                        "WHERE %s.id = EXCLUDED.id;",
                SqlTable.USER.getName(),
                SqlTable.USER.getName()
        );

        JsonArray params = new JsonArray()
                .add(user.getUserId())     // insert id
                .add(user.getUsername())   // insert display_name
                .add(user.getUsername())   // update display_name
                .addNull();                // update revoked_at = null

        return new JsonObject()
                .put("statement", statement)
                .put("values", params)
                .put("action", "prepared");
    }

    @Override
    @SuppressWarnings("unchecked")
    public Future<List<String>> getSessionUserStructureNSubstructureIds(UserInfos user) {
        Promise<List<String>> promise = Promise.promise();
        getSessionUserStructureNSubstructureIdsRequest(user)
                .onSuccess(structureIds -> promise.complete(structureIds
                        .getJsonArray(STRUCTUREIDS, new JsonArray()).getList()))
                .onFailure(err -> {
                    String errorMessage = "Fail to get structure and substructure ids";
                    LoggerHelper.logError(this, "getSessionUserStructureNSubstructureIds", errorMessage);
                    promise.fail(errorMessage);
                });
        return promise.future();
    }

    private Future<JsonObject> getSessionUserStructureNSubstructureIdsRequest(UserInfos user) {
        Promise<JsonObject> promise = Promise.promise();

        String query = String.format(" MATCH (struct:Structure)-[r:HAS_ATTACHMENT*1..]->(s:Structure)  " +
                        " WHERE s.id IN {%s} " +
                        " RETURN {%s} + COLLECT(DISTINCT struct.id) AS %s",
                STRUCTUREIDS, STRUCTUREIDS, STRUCTUREIDS);

        JsonObject params = new JsonObject();
        params.put(STRUCTUREIDS, user.getStructures());

        neo.execute(query, params, Neo4jResult.validUniqueResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::getSessionUserStructureNSubstructureIdsRequest] Fail to get structure " +
                                "and substructure ids",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

    public Future<List<User>> getVisibleUsersByAdminSearch(HttpServerRequest request, String query) {
        Promise<List<User>> promise = Promise.promise();

        searchRequest(request, query)
                .compose(queriedUsers -> setUserState(new User().toList(queriedUsers), request)
                .onSuccess(promise::complete))
                .onFailure(promise::fail);

        return promise.future();
    }

    private Future<List<User>> setUserState(List<User> users, HttpServerRequest request) {
        Promise<List<User>> promise = Promise.promise();

        String host = Renders.getHost(request);
        String language = I18n.acceptLanguage(request);
        String inactiveDisplayName = I18n.getInstance().translate("minibadge.disable.user", host, language);

        List<String> userIds = users.stream().map(User::getUserId).collect(Collectors.toList());
        getUserMinibadgeByIds(userIds)
                .onSuccess(userMinibadgeList -> {
                    Map<String, UserMinibadge> userMinibadgeMap = userMinibadgeList.stream()
                            .collect(Collectors.toMap(UserMinibadge::getId, um -> um));
                    for (User user : users) {
                        MinibadgeUserState state = Optional.ofNullable(userMinibadgeMap.get(user.getUserId()))
                                .map(um -> {
                                    if (um.getRevokedAt() != null) return MinibadgeUserState.REVOKED;
                                    if (Objects.equals(um.getDisplayName(), inactiveDisplayName)) return MinibadgeUserState.INACTIVE;
                                    return MinibadgeUserState.ACTIVE;
                                })
                                .orElse(MinibadgeUserState.INACTIVE);

                        user.setMinibadgeUserState(state);
                    }
                    promise.complete(users);
                })
                .onFailure(err -> LoggerHelper.logError(this, "setUserState", "Error during set users state"));

        return promise.future();
    }

    private Future<List<UserMinibadge>> getUserMinibadgeByIds(List<String> userIds) {
        Promise<List<UserMinibadge>> promise = Promise.promise();

        String query = "SELECT * from " + SqlTable.USER.getName() +
                      " WHERE id IN " + Sql.listPrepared(userIds);

        JsonArray params = new JsonArray(userIds);

        String errorMessage = "Error fetching UserMinibadge by IDs";
        String completeLog = LoggerHelper.getCompleteLog(this, "getUserMinibadgeByIds", errorMessage);
        sql.prepared(query, params, SqlResult.validResultHandler(ModelHelper.sqlResultToModel(promise, UserMinibadge.class, completeLog)));

        return promise.future();
    }

    public Future<Void> removeMinibadgePreferencesForUsers(List<String> userIds) {
        Promise<Void> promise = Promise.promise();

        removeMinibadgePreferencesForUsersRequest(userIds)
                .onSuccess(res -> promise.complete())
                .onFailure(promise::fail);

        return promise.future();
    }

    private Future<JsonObject> removeMinibadgePreferencesForUsersRequest(List<String> userIds) {
        Promise<JsonObject> promise = Promise.promise();

        JsonObject emptyMinibadgeChart = new JsonObject()
                .put("acceptReceive", null)
                .put("validateChart", null)
                .put("acceptAssign", null)
                .put("readChart", null);

        String query =
                "MATCH (u:User)-[:PREFERS]->(uac:UserAppConf) " +
                        "WHERE u.id IN {userIds} " +
                        "SET uac.minibadgechart = {minibadgechart} " +
                        "RETURN count(uac) AS updated";

        JsonObject params = new JsonObject().put(USERIDS, userIds).put(MINIBADGECHART, emptyMinibadgeChart.encode());

        String errorMessage = "Error removing Minibadge preferences for users";
        String completeLog = LoggerHelper.getCompleteLog(this, "removeMinibadgePreferencesForUsersRequest", errorMessage);
        neo.execute(query, params, Neo4jResult.validUniqueResultHandler(PromiseHelper.handler(promise, completeLog)));

        return promise.future();
    }

    public Future<Void> revokeUsersMinibadgeConsent(List<String> userIds, HttpServerRequest request) {
        Promise<Void> promise = Promise.promise();

        revokeUsersMinibadgeConsentRequest(userIds, request)
                .onSuccess(res -> promise.complete())
                .onFailure(promise::fail);

        return promise.future();
    }

    private Future<JsonArray> revokeUsersMinibadgeConsentRequest(List<String> userIds, HttpServerRequest request) {
        Promise<JsonArray> promise = Promise.promise();

        if (userIds == null || userIds.isEmpty()) {
            return Future.succeededFuture(new JsonArray());
        }

        String host = Renders.getHost(request);
        String language = I18n.acceptLanguage(request);
        String inactiveDisplayName = I18n.getInstance().translate("minibadge.disable.user", host, language);

        String query = "UPDATE " + SqlTable.USER.getName() +
                " SET revoked_at = " + NOW_SQL_FUNCTION +
                ", display_name = ? " +
                " WHERE id IN " + Sql.listPrepared(userIds);

        JsonArray params = new JsonArray();
        params.add(inactiveDisplayName);
        params.addAll(new JsonArray(userIds));

        String errorMessage = "Error revoking Minibadge consent for users";
        String completeLog = LoggerHelper.getCompleteLog(this, "revokeUsersMinibadgeConsentRequest", errorMessage);
        sql.prepared(query, params, SqlResult.validResultHandler(PromiseHelper.handler(promise, completeLog)));

        return promise.future();
    }

    public Future<Optional<UserMinibadge>> getUserMinibadge(String userId) {
        return getUserMinibadgeRequest(userId);
    }

    private Future<Optional<UserMinibadge>> getUserMinibadgeRequest(String userId) {
        Promise<Optional<UserMinibadge>> promise = Promise.promise();

        String query = "SELECT * from " + SqlTable.USER.getName() +
                      " WHERE id = ? ";

        JsonArray params = new JsonArray().add(userId);

        String errorMessage = "Error fetching UserMinibadge by ID";
        String completeLog = LoggerHelper.getCompleteLog(this, "getUserMinibadgeRequest", errorMessage);
        sql.prepared(query, params, SqlResult.validUniqueResultHandler(ModelHelper.sqlUniqueResultToModel(promise, UserMinibadge.class, completeLog)));

        return promise.future();
    }
}
