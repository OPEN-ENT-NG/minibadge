package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.core.enums.SqlTable;
import fr.openent.minibadge.helper.PromiseHelper;
import fr.openent.minibadge.helper.SqlHelper;
import fr.openent.minibadge.helper.UserHelper;
import fr.openent.minibadge.model.Badge;
import fr.openent.minibadge.model.User;
import fr.openent.minibadge.service.BadgeService;
import fr.openent.minibadge.service.ServiceRegistry;
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

import static fr.openent.minibadge.core.constants.Field.*;

public class DefaultBadgeService implements BadgeService {

    private static final BadgeService instance = new DefaultBadgeService();
    private DefaultBadgeService() {}
    public static BadgeService getInstance() {
        return instance;
    }

    private final UserService userService = ServiceRegistry.getService(UserService.class);
    private final Sql sql = Sql.getInstance();

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
                        " ON CONFLICT DO NOTHING;", SqlTable.BADGE.getName(),
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

        // Each CTE is restricted to the owner's own badges (`owner_badge`), so a request never
        // aggregates the whole badge_assigned table: the owner id is bound once per CTE, plus once more
        // for the unchanged outer filter.
        JsonArray params = new JsonArray()
                .add(ownerId)
                .add(ownerId)
                .add(ownerId)
                .add(ownerId);

        // One row per badge (owner + type) with every non-revoked assignment counted, expired ones
        // included: filtering this aggregate on badge_assigned_active would make a type whose
        // assignments have all expired vanish from "Mes badges reçus". Instead it stays listed and
        // carries `count_active` (0 = expired, Epic C) and `max_expires_at` (NULL as soon as one of the
        // assignments is permanent). badge_assigned_valid has no expires_at column (left untouched on
        // purpose), hence the last CTE reading the table with the same `revoked_at IS NULL` filter.
        String request = String.format(" WITH assign as (SELECT ba.badge_id, " +
                " COUNT(ba.id) over (partition by ba.badge_id)       as count_assigned, " +
                " MAX(ba.created_at) over (partition by ba.badge_id) as last_assign_created " +
                " FROM %1$s ba INNER JOIN %4$s ob ON ob.id = ba.badge_id AND ob.owner_id = ?), " +
                " assign_active as (SELECT baa.badge_id, COUNT(baa.id) as count_active " +
                " FROM %2$s baa INNER JOIN %4$s ob ON ob.id = baa.badge_id AND ob.owner_id = ? GROUP BY baa.badge_id), " +
                " assign_expiry as (SELECT bae.badge_id, " +
                " CASE WHEN bool_or(bae.expires_at IS NULL) THEN NULL ELSE MAX(bae.expires_at) END as max_expires_at " +
                " FROM %3$s bae INNER JOIN %4$s ob ON ob.id = bae.badge_id AND ob.owner_id = ?" +
                " WHERE bae.revoked_at IS NULL GROUP BY bae.badge_id) " +
                " SELECT DISTINCT b.id, b.owner_id, b.badge_type_id, privatized_at, refused_at, disabled_at, " +
                " bt.label as badge_type_label, bt.picture_id as badge_type_picture_id, ba.count_assigned, " +
                " COALESCE(aa.count_active, 0) as count_active, ae.max_expires_at, " +
                " ba.last_assign_created " +
                " FROM %4$s b INNER JOIN assign ba on ba.badge_id = b.id " +
                " LEFT JOIN assign_active aa on aa.badge_id = b.id " +
                " LEFT JOIN assign_expiry ae on ae.badge_id = b.id " +
                " INNER JOIN %5$s bt ON b.badge_type_id = bt.id " +
                " WHERE b.owner_id = ? AND ba.count_assigned > 0 %6$s %7$s ORDER BY last_assign_created DESC",
                SqlTable.BADGE_ASSIGNED_VALID.getName(), SqlTable.BADGE_ASSIGNED_ACTIVE.getName(),
                SqlTable.BADGE_ASSIGNED.getName(), SqlTable.BADGE.getName(),
                SqlTable.BADGE_TYPE.getName(), (query != null && !query.isEmpty()) ? "AND" : "",
                SqlHelper.searchQueryInColumns(query, Collections.singletonList("bt.label"), params));

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
                " WHERE owner_id = ? AND badge_type_id = ?", SqlTable.BADGE.getName());

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

        updateTimePropertyRequest(ownerId, typeId, PRIVATIZED_AT)
                .onSuccess(badge -> promise.complete())
                .onFailure(promise::fail);

        return promise.future();
    }

    @Override
    public Future<Void> refuseBadge(String ownerId, long typeId) {
        Promise<Void> promise = Promise.promise();

        updateTimePropertyRequest(ownerId, typeId, REFUSED_AT)
                .onSuccess(badge -> promise.complete())
                .onFailure(promise::fail);

        return promise.future();
    }


    private Future<JsonObject> updateTimePropertyRequest(String ownerId, long typeId, String timeProperty) {
        Promise<JsonObject> promise = Promise.promise();

        String request = String.format("UPDATE %s " +
                " SET %s = now() " +
                " WHERE owner_id = ? AND badge_type_id = ?", SqlTable.BADGE.getName(), timeProperty);

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
                .compose(event -> changeDisableBadgesRequest(ownerId, NOW_SQL_FUNCTION))
                .onSuccess(badge -> promise.complete())
                .onFailure(promise::fail);

        return promise.future();
    }

    @Override
    public Future<Void> enableBadges(String ownerId) {
        Promise<Void> promise = Promise.promise();
        userService.upsert(Collections.singletonList(ownerId))
                .compose(event -> changeDisableBadgesRequest(ownerId, NULL))
                .onSuccess(badge -> promise.complete())
                .onFailure(promise::fail);

        return promise.future();
    }

    private Future<JsonObject> changeDisableBadgesRequest(String ownerId, String disableValue) {
        Promise<JsonObject> promise = Promise.promise();

        String request = String.format("UPDATE %s SET disabled_at = %s WHERE owner_id = ?", SqlTable.BADGE.getName(), disableValue);

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
                SqlTable.BADGE_PUBLIC.getName(), SqlTable.BADGE_ASSIGNED_ACTIVE.getName(),
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
                SqlTable.BADGE_PUBLIC.getName(), SqlTable.BADGE_ASSIGNED_ACTIVE.getName());

        sql.prepared(request, params, SqlResult.validUniqueResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::countBadgeTypeReceiverIdsRequest] Fail to count badge types receivers",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }
}
