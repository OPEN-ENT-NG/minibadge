package fr.cgi.minibadge.service.impl;

import fr.cgi.minibadge.Minibadge;
import fr.cgi.minibadge.core.constants.Database;
import fr.cgi.minibadge.helper.PromiseHelper;
import fr.cgi.minibadge.helper.SqlHelper;
import fr.cgi.minibadge.model.Badge;
import fr.cgi.minibadge.service.BadgeService;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class DefaultBadgeService implements BadgeService {

    private final Sql sql;
    private static final String BADGE_TABLE = String.format("%s.%s", Minibadge.dbSchema, Database.BADGE);
    public static final String BADGE_ASSIGNABLE_TABLE = String.format("%s.%s", Minibadge.dbSchema, Database.BADGE_ASSIGNABLE);

    public DefaultBadgeService(Sql sql) {
        this.sql = sql;
    }

    @Override
    public Future<Void> createBadges(long typeId, List<String> ownerIds) {
        Promise<Void> promise = Promise.promise();

        createBadgesRequest(typeId, ownerIds)
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
                        " WHERE b.owner_id = ? %s %s",
                DefaultBadgeAssignedService.BADGE_ASSIGNED_VALID_TABLE, BADGE_TABLE,
                DefaultBadgeTypeService.BADGE_TYPE_TABLE,
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
    public Future<Void> disableBadges(String ownerId) {
        Promise<Void> promise = Promise.promise();

        changeDisableBadgesRequest(ownerId, Database.NOW_SQL_FUNCTION)
                .onSuccess(badge -> promise.complete())
                .onFailure(promise::fail);

        return promise.future();
    }

    @Override
    public Future<Void> enableBadges(String ownerId) {
        Promise<Void> promise = Promise.promise();

        changeDisableBadgesRequest(ownerId, Database.NULL)
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
}
