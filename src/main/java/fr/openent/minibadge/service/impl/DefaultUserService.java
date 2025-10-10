package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.core.constants.Rights;
import fr.openent.minibadge.core.enums.SqlTable;
import fr.openent.minibadge.helper.Neo4jHelper;
import fr.openent.minibadge.helper.PromiseHelper;
import fr.openent.minibadge.helper.SettingHelper;
import fr.openent.minibadge.model.User;
import fr.openent.minibadge.service.UserService;
import fr.wseduc.webutils.I18n;
import fr.wseduc.webutils.Server;
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

        String query = " MATCH (u:User) " +
                " WHERE u.id IN {userIds} " +
                " OPTIONAL MATCH (u)-[:ADMINISTRATIVE_ATTACHMENT]->(sAdminAttach:Structure) " +
                " OPTIONAL MATCH (u)-[:IN]->(pg:ProfileGroup)-[:HAS_PROFILE]->(profile:Profile) " +
                " OPTIONAL MATCH (pg)-[:DEPENDS]->(sProfile:Structure) " +
                " WITH u, profile, COLLECT(distinct sProfile.id) + COLLECT(distinct sAdminAttach.id) as concatStructureIds " +
                " UNWIND concatStructureIds as structures " +
                " RETURN distinct u.id as id, u.login as login," +
                " u.displayName as username, profile.name as type, COLLECT(distinct structures) as structureIds " +
                " ORDER BY username ";
        JsonObject params = new JsonObject();
        params.put("userIds", userIds);
        neo.execute(query, params, Neo4jResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::getUsersRequest] Fail to create badge assigned",
                        this.getClass().getSimpleName()))));

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
        String statement = String.format(" INSERT INTO %s (id , display_name) " +
                " VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET display_name = ? " +
                "  WHERE %s.id = EXCLUDED.id;", SqlTable.USER.getName(), SqlTable.USER.getName());
        JsonArray params = new JsonArray()
                .add(user.getUserId())
                .add(user.getUsername())
                .add(user.getUsername());

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
                .onFailure(promise::fail)
                .onSuccess(structureIds -> promise.complete(structureIds
                        .getJsonArray(STRUCTUREIDS, new JsonArray()).getList()));
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
}
