package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.Minibadge;
import fr.openent.minibadge.core.constants.Database;
import fr.openent.minibadge.helper.PromiseHelper;
import fr.openent.minibadge.helper.SqlHelper;
import fr.openent.minibadge.helper.UserHelper;
import fr.openent.minibadge.model.Badge;
import fr.openent.minibadge.model.User;
import fr.openent.minibadge.service.BadgeService;
import fr.openent.minibadge.service.UserService;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;
import org.entcore.common.user.UserInfos;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class DefaultBadgeService implements BadgeService {

    public static final String BADGE_PUBLIC_TABLE = String.format("%s.%s", Minibadge.dbSchema, Database.BADGE_PUBLIC);
    public static final String BADGE_ASSIGNABLE_TABLE = String.format("%s.%s", Minibadge.dbSchema, Database.BADGE_ASSIGNABLE);
    public static final String BADGE_TABLE = String.format("%s.%s", Minibadge.dbSchema, Database.BADGE);
    public static final String BADGE_DISABLED_TABLE = String.format("%s.%s", Minibadge.dbSchema, Database.BADGE_DISABLED);
    private final UserService userService;
    private final Sql sql;

    public DefaultBadgeService(Sql sql, UserService userService) {
        this.sql = sql;
        this.userService = userService;
    }

    @Override
    public Future<Void> createBadges(long typeId, List<String> ownerIds) {
        Promise<Void> promise = Promise.promise();

        userService.upsert(ownerIds)
                .compose(event -> createBadgesRequest(typeId, ownerIds))
                .onSuccess(badgeTypes -> promise.complete())
                .onFailure(promise::fail);

        return promise.future();
    }

    private Future<JsonArray> createBadgesRequest(long typeId, List<String> ownerIds) {
        Promise<JsonArray> promise = Promise.promise();

        JsonArray params = new JsonArray();
        String request = String.format("INSERT INTO %s (owner_id, badge_type_id) " +
                        " VALUES %s " +
                        " ON CONFLICT DO NOTHING;", BADGE_TABLE,
                ownerIds.stream()
                        .map(ownerId -> {
                            params.add(ownerId)
                                    .add(typeId);
                            return Sql.listPrepared(Arrays.asList(ownerId, typeId));
                        })
                        .collect(Collectors.joining(", "))
        );

        sql.prepared(request, params, SqlResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::createBadgesRequest] Fail to create badges",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

    @Override
    public Future<List<Badge>> getBadges(String ownerId, String query) {
        Promise<List<Badge>> promise = Promise.promise();

        getBadgesRequest(ownerId, query)
                .onSuccess(badges -> promise.complete(new Badge().toList(badges)))
                .onFailure(promise::fail);

        return promise.future();
    }

    private Future<JsonArray> getBadgesRequest(String ownerId, String query) {
        Promise<JsonArray> promise = Promise.promise();

        JsonArray params = new JsonArray()
                .add(ownerId);
        String request = String.format("SELECT b.id, b.owner_id, b.badge_type_id, privatized_at, refused_at, disabled_at, " +
                        " bt.label as badge_type_label, bt.picture_id as badge_type_picture_id, " +
                        " (SELECT COUNT(DISTINCT ba.id) FROM %s ba  WHERE ba.badge_id = b.id) as count_assigned " +
                        " FROM %s b INNER JOIN %s bt ON b.badge_type_id = bt.id " +
                        " WHERE b.owner_id = ? AND (SELECT COUNT(DISTINCT ba.id)FROM %s ba  WHERE ba.badge_id = b.id )   > 0  " +
                        " %s %s ",
                DefaultBadgeAssignedService.BADGE_ASSIGNED_VALID_TABLE, BADGE_TABLE,
                DefaultBadgeTypeService.BADGE_TYPE_TABLE,
                DefaultBadgeAssignedService.BADGE_ASSIGNED_VALID_TABLE,
                (query != null && !query.isEmpty()) ? "AND" : "",
                SqlHelper.searchQueryInColumns(query, Collections.singletonList(String.format("%s%s", "bt.", Database.LABEL)), params));

        sql.prepared(request, params, SqlResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::getBadgesRequest] Fail to retrieve badges",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

    @Override
    public Future<Void> publishBadge(String ownerId, long typeId) {
        Promise<Void> promise = Promise.promise();

        resetTimePropertiesRequest(ownerId, typeId)
                .onSuccess(badge -> promise.complete())
                .onFailure(promise::fail);

        return promise.future();
    }

    private Future<JsonObject> resetTimePropertiesRequest(String ownerId, long typeId) {
        Promise<JsonObject> promise = Promise.promise();

        String request = String.format("UPDATE %s " +
                " SET privatized_at = null, refused_at = null, disabled_at = null" +
                " WHERE owner_id = ? AND badge_type_id = ?", BADGE_TABLE);

        JsonArray params = new JsonArray()
                .add(ownerId)
                .add(typeId);

        sql.prepared(request, params, SqlResult.validUniqueResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::updateTimeProperty] Fail to update badge",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }


    @Override
    public Future<Void> privatizeBadge(String ownerId, long typeId) {
        Promise<Void> promise = Promise.promise();

        updateTimePropertyRequest(ownerId, typeId, Database.PRIVATIZED_AT)
                .onSuccess(badge -> promise.complete())
                .onFailure(promise::fail);

        return promise.future();
    }

    @Override
    public Future<Void> refuseBadge(String ownerId, long typeId) {
        Promise<Void> promise = Promise.promise();

        updateTimePropertyRequest(ownerId, typeId, Database.REFUSED_AT)
                .onSuccess(badge -> promise.complete())
                .onFailure(promise::fail);

        return promise.future();
    }


    private Future<JsonObject> updateTimePropertyRequest(String ownerId, long typeId, String timeProperty) {
        Promise<JsonObject> promise = Promise.promise();

        String request = String.format("UPDATE %s " +
                " SET %s = now() " +
                " WHERE owner_id = ? AND badge_type_id = ?", BADGE_TABLE, timeProperty);

        JsonArray params = new JsonArray()
                .add(ownerId)
                .add(typeId);

        sql.prepared(request, params, SqlResult.validUniqueResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::updateTimeProperty] Fail to update badge",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

    @Override
    public Future<Void> disableBadges(String ownerId, String host, String language) {
        Promise<Void> promise = Promise.promise();
        userService.anonimyzeUser(ownerId, host, language)
                .compose(event -> changeDisableBadgesRequest(ownerId, Database.NOW_SQL_FUNCTION))
                .onSuccess(badge -> promise.complete())
                .onFailure(promise::fail);

        return promise.future();
    }

    @Override
    public Future<Void> enableBadges(String ownerId) {
        Promise<Void> promise = Promise.promise();
        userService.upsert(Collections.singletonList(ownerId))
                .compose(event -> changeDisableBadgesRequest(ownerId, Database.NULL))
                .onSuccess(badge -> promise.complete())
                .onFailure(promise::fail);

        return promise.future();
    }

    private Future<JsonObject> changeDisableBadgesRequest(String ownerId, String disableValue) {
        Promise<JsonObject> promise = Promise.promise();

        String request = String.format("UPDATE %s SET disabled_at = %s WHERE owner_id = ?", BADGE_TABLE, disableValue);

        JsonArray params = new JsonArray().add(ownerId);

        sql.prepared(request, params, SqlResult.validUniqueResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::updateTimeProperty] Fail to update badge",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

    @Override
    @SuppressWarnings("unchecked")
    public Future<List<User>> getBadgeTypeReceivers(long typeId, int limit, Integer offset) {
        Promise<List<User>> promise = Promise.promise();

        List<User> receivers = new ArrayList<>();
        getBadgeTypeReceiverIdsRequest(typeId, limit, offset)
                .compose(users -> {
                    receivers.addAll(new User().toList(users));
                    return userService.getUsers(receivers.stream().map(UserInfos::getUserId)
                            .collect(Collectors.toList()));
                })
                .onSuccess(users -> promise.complete(UserHelper.mergeUsernamesAndProfiles(users, receivers)))
                .onFailure(promise::fail);

        return promise.future();
    }

    private Future<JsonArray> getBadgeTypeReceiverIdsRequest(long typeId, Integer limit, Integer offset) {
        Promise<JsonArray> promise = Promise.promise();
        JsonArray params = new JsonArray()
                .add(typeId);

        String request = String.format(" SELECT DISTINCT(owner_id) as id, " +
                        " COUNT(bav.id) over (partition by owner_id) as badge_assigned_total, " +
                        " max(bav.created_at) over (partition by owner_id) as last_created_at " +
                        " FROM %s bp " +
                        " INNER JOIN %s bav on bav.badge_id = bp.id " +
                        " WHERE badge_type_id = ? " +
                        " GROUP BY owner_id, bav.created_at, bav.id " +
                        " ORDER BY last_created_at DESC %s ",
                BADGE_PUBLIC_TABLE, DefaultBadgeAssignedService.BADGE_ASSIGNED_VALID_TABLE,
                SqlHelper.addLimitOffset(limit, offset, params));

        sql.prepared(request, params, SqlResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::getBadgeTypeReceiverIdsRequest] Fail to retrieve badge types receivers",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

    @Override
    public Future<Integer> countTotalReceivers(long typeId) {
        Promise<Integer> promise = Promise.promise();

        countTotalReceiversRequest(typeId)
                .onSuccess(result -> promise.complete(SqlHelper.getResultCount(result)))
                .onFailure(promise::fail);

        return promise.future();

    }

    private Future<JsonObject> countTotalReceiversRequest(long typeId) {
        Promise<JsonObject> promise = Promise.promise();

        JsonArray params = new JsonArray()
                .add(typeId);

        String request = String.format(" SELECT COUNT(DISTINCT(owner_id)) " +
                        " FROM %s bp " +
                        " INNER JOIN %s bav on bav.badge_id = bp.id " +
                        " WHERE badge_type_id = ? ",
                BADGE_PUBLIC_TABLE, DefaultBadgeAssignedService.BADGE_ASSIGNED_VALID_TABLE);

        sql.prepared(request, params, SqlResult.validUniqueResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::countBadgeTypeReceiverIdsRequest] Fail to count badge types receivers",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }
}
