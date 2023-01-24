package fr.cgi.minibadge.service.impl;

import fr.cgi.minibadge.Minibadge;
import fr.cgi.minibadge.core.constants.Database;
import fr.cgi.minibadge.helper.PromiseHelper;
import fr.cgi.minibadge.helper.SqlHelper;
import fr.cgi.minibadge.helper.UserHelper;
import fr.cgi.minibadge.model.BadgeAssigned;
import fr.cgi.minibadge.model.User;
import fr.cgi.minibadge.service.BadgeAssignedService;
import fr.cgi.minibadge.service.BadgeService;
import fr.cgi.minibadge.service.UserService;
import io.vertx.core.CompositeFuture;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;
import org.entcore.common.user.UserInfos;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static fr.cgi.minibadge.core.constants.Field.*;
import static fr.cgi.minibadge.service.impl.DefaultBadgeService.*;
import static fr.cgi.minibadge.service.impl.DefaultBadgeTypeService.BADGE_TYPE_TABLE;
import static fr.cgi.minibadge.service.impl.DefaultUserService.USER_TABLE;

public class DefaultBadgeAssignedService implements BadgeAssignedService {

    public static final String BADGE_ASSIGNED_VALID_TABLE = String.format("%s.%s", Minibadge.dbSchema, Database.BADGE_ASSIGNED_VALID);
    private static final String BADGE_ASSIGNED_TABLE = String.format("%s.%s", Minibadge.dbSchema, Database.BADGE_ASSIGNED);
    private static final String BADGE_ASSIGNED_STRUCTURE_TABLE = String.format("%s.%s", Minibadge.dbSchema, Database.BADGE_ASSIGNED_STRUCTURE);
    private final Sql sql;
    private final BadgeService badgeService;
    private final UserService userService;

    public DefaultBadgeAssignedService(Sql sql, BadgeService badgeService, UserService userService) {
        this.sql = sql;
        this.badgeService = badgeService;
        this.userService = userService;
    }

    @Override
    public Future<Void> assign(long typeId, List<String> ownerIds, UserInfos assignor) {
        Promise<Void> promise = Promise.promise();
        badgeService
                .createBadges(typeId, ownerIds)
                .compose(badgeResult -> createBadgeAssignedRequest(typeId, ownerIds, assignor))
                .compose(badgeTypes -> createBadgeAssignedStructures(typeId, ownerIds, assignor))
                .onSuccess(badgeTypes -> promise.complete())
                .onFailure(promise::fail);
        return promise.future();
    }

    @Override
    public Future<List<BadgeAssigned>> getBadgesGiven(EventBus eb, String query, String startDate, String endDate, String sortBy,
                                                      Boolean sortAsc, String assignorId) {
        Promise<List<BadgeAssigned>> promise = Promise.promise();
        getBadgesGivenRequest(assignorId, startDate, endDate, sortBy, sortAsc, query)
                .onSuccess(badgesGiven -> promise.complete(new BadgeAssigned().toList(badgesGiven)))
                .onFailure(promise::fail);

        return promise.future();
    }

    private Future<JsonArray> getBadgesGivenRequest(String assignorId, String startDate, String endDate,
                                                    String sortBy, Boolean sortAsc, String query) {
        Promise<JsonArray> promise = Promise.promise();
        List<String> acceptedSort = Arrays.asList(LABEL, CREATED_AT, REVOKED_AT, DISPLAY_NAME);
        List<String> columns = Arrays.asList(DISPLAY_NAME, LABEL);
        JsonArray params = new JsonArray();
        params.add(assignorId);
        boolean hasDates = startDate != null && endDate != null;
        boolean hasSort = sortBy != null && sortAsc != null;
        if (hasDates) {
            params.add(startDate);
            params.add(endDate);
        }
        String request = "SELECT ba.id, ba.badge_id, ba.assignor_id, ba.revoked_at, ba.updated_at, " +
                " ba.created_at as created_at , bt.picture_id , us.display_name ," +
                " bt.label as label, badge.owner_id " +
                ", badge.id as " + BADGE_ID + " , bt.id as  " + BADGE_TYPE_ID +
                " FROM " + BADGE_ASSIGNED_TABLE + " as ba " +
                " INNER JOIN " + BADGE_TABLE + " " +
                " on ba.badge_id = badge.id " +
                " INNER JOIN " + BADGE_TYPE_TABLE + " as bt " +
                " on badge.badge_type_id = bt.id " +
                " INNER JOIN " + USER_TABLE + " as us " +
                " ON us.id = badge.owner_id " +
                " WHERE ba.assignor_id = ? " +
                ((hasDates) ? " AND ba.created_at::date  >= to_date(?,'DD-MM-YYYY') " +
                        " AND ba.created_at::date  <= to_date( ?, 'DD-MM-YYYY') " : "") +
                ((query != null && !query.isEmpty()) ? " AND " + SqlHelper.searchQueryInColumns(query, columns, params) : " ") +
                " ORDER BY " +
                ((hasSort && acceptedSort.contains(sortBy)) ? sortBy + (sortAsc ? " ASC " : " DESC ") : " id ") +
                " ; ";

        sql.prepared(request, params, SqlResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::getBadgesGivenRequest] Fail to retrieve badge given",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }


    private Future<JsonArray> createBadgeAssignedRequest(long typeId,
                                                         List<String> ownerIds, UserInfos assignor) {
        Promise<JsonArray> promise = Promise.promise();

        String request = String.format("INSERT INTO %s (badge_id, assignor_id) " +
                        " SELECT id as badge_id, ? as assignor_id FROM %s " +
                        " WHERE badge_type_id = ? AND owner_id IN %s", BADGE_ASSIGNED_TABLE,
                DefaultBadgeService.BADGE_ASSIGNABLE_TABLE, Sql.listPrepared(ownerIds));

        JsonArray params = new JsonArray()
                .add(assignor.getUserId())
                .add(typeId)
                .addAll(new JsonArray(ownerIds));

        sql.prepared(request, params, SqlResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::createBadgeAssignedRequest] Fail to create badge assigned",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

    private Future<Void> createBadgeAssignedStructures(long typeId,
                                                       List<String> ownerIds, UserInfos assignor) {
        Promise<Void> promise = Promise.promise();

        Future<List<User>> ownersFuture = userService.getUsers(ownerIds);
        Future<List<BadgeAssigned>> badgesAssignedFuture = getBadgeAssigned(typeId, ownerIds, assignor);

        CompositeFuture.all(ownersFuture, badgesAssignedFuture)
                .compose(result -> createBadgeAssignedStructuresRequest(badgesAssignedFuture.result(),
                        ownersFuture.result(), assignor))
                .onSuccess(result -> promise.complete())
                .onFailure(promise::fail);

        return promise.future();
    }

    private Future<List<BadgeAssigned>> getBadgeAssigned(long typeId, List<String> ownerIds, UserInfos assignor) {
        Promise<List<BadgeAssigned>> promise = Promise.promise();
        getBadgeAssignedRequest(typeId, ownerIds, assignor)
                .onSuccess(badgesAssigned -> promise.complete(new BadgeAssigned().toList(badgesAssigned)))
                .onFailure(promise::fail);

        return promise.future();
    }

    private Future<JsonArray> getBadgeAssignedRequest(long typeId, List<String> ownerIds, UserInfos assignor) {
        Promise<JsonArray> promise = Promise.promise();
        String request = String.format(" SELECT bav.id as id, bp.badge_type_id as badge_type_id, bp.owner_id as owner_id, " +
                        " bav.assignor_id as assignor_id " +
                        " FROM %s bav INNER JOIN %s bp on bav.badge_id = bp.id " +
                        " WHERE badge_type_id = ? AND owner_id IN %s AND assignor_id = ?",
                BADGE_ASSIGNED_VALID_TABLE, BADGE_PUBLIC_TABLE, Sql.listPrepared(ownerIds));

        JsonArray params = new JsonArray()
                .add(typeId)
                .addAll(new JsonArray(ownerIds))
                .add(assignor.getUserId());

        sql.prepared(request, params,
                SqlResult.validResultHandler(PromiseHelper.handler(promise,
                        String.format("[Minibadge@%s::getBadgeAssignedRequest] " +
                                        "Fail to retrieve badge assigned",
                                this.getClass().getSimpleName()))));

        return promise.future();
    }

    private Future<JsonArray> createBadgeAssignedStructuresRequest(List<BadgeAssigned> badgesAssigned, List<User> owners,
                                                                   UserInfos assignor) {
        Promise<JsonArray> promise = Promise.promise();

        JsonArray params = new JsonArray();
        String request = String.format("INSERT INTO %s (badge_assigned_id, structure_id, is_structure_assigner, " +
                        " is_structure_receiver) VALUES %s", BADGE_ASSIGNED_STRUCTURE_TABLE,
                badgeAssignedStructureToValuesInsert(badgesAssigned, owners, assignor, params));

        sql.prepared(request, params, SqlResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::createBadgeAssignedStructuresRequest] Fail to create badge assigned " +
                                "structures",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

    private String badgeAssignedStructureToValuesInsert(List<BadgeAssigned> badgesAssigned, List<User> owners,
                                                        UserInfos assignor, JsonArray params) {
        return badgesAssigned
                .stream().map(badgeAssigned ->
                        owners.stream()
                                .filter(owner -> owner.getUserId().equals(badgeAssigned.badge().ownerId()))
                                .findFirst()
                                .map(owner -> {
                                    List<String> commonStructureIds = owner.getStructures().stream()
                                            .filter(structureId -> assignor.getStructures().contains(structureId))
                                            .collect(Collectors.toList());
                                    return badgeAssignedStructureToValuesInsert(assignor, owner, badgeAssigned,
                                            commonStructureIds, params);
                                })
                                .orElse("")
                )
                .collect(Collectors.joining(", "));
    }

    private String badgeAssignedStructureToValuesInsert(UserInfos assignor, User owner, BadgeAssigned badgeAssigned,
                                                        List<String> commonStructureIds, JsonArray params) {
        if (commonStructureIds.isEmpty()) {
            return Stream.concat(
                    owner.getStructures().stream()
                            .map(structureId -> badgeAssignedStructureToValueInsert(
                                    badgeAssigned.id(), structureId, false,
                                    true, params)),
                    assignor.getStructures().stream()
                            .map(structureId -> badgeAssignedStructureToValueInsert(
                                    badgeAssigned.id(), structureId, true,
                                    false, params))
            ).collect(Collectors.joining(", "));
        }

        return commonStructureIds.stream()
                .map(structureId ->
                        badgeAssignedStructureToValueInsert(badgeAssigned.id(), structureId,
                                true, true, params))
                .collect(Collectors.joining(", "));
    }

    private String badgeAssignedStructureToValueInsert(Long badgeAssignedId, String structureId,
                                                       Boolean isStructureAssigner, Boolean isStructureReceiver,
                                                       JsonArray params) {
        JsonArray paramsValues = new JsonArray()
                .add(badgeAssignedId)
                .add(structureId)
                .add(isStructureAssigner)
                .add(isStructureReceiver);

        params.addAll(paramsValues);

        return Sql.listPrepared(paramsValues);
    }

    @Override
    public Future<List<User>> getBadgeTypeAssigners(long typeId, UserInfos badgeOwner, int limit, Integer offset) {
        Promise<List<User>> promise = Promise.promise();

        List<User> assigners = new ArrayList<>();
        getBadgeTypeAssignerIdsRequest(typeId, badgeOwner, limit, offset)
                .compose(users -> {
                    assigners.addAll(new User().toList(users));
                    return userService.getUsers(assigners.stream().map(UserInfos::getUserId)
                            .collect(Collectors.toList()));
                })
                .onSuccess(users -> promise.complete(UserHelper.mergeUsernamesAndProfiles(users, assigners)))
                .onFailure(promise::fail);

        return promise.future();
    }


    private Future<JsonArray> getBadgeTypeAssignerIdsRequest(long typeId, UserInfos badgeOwner, int limit, Integer offset) {
        Promise<JsonArray> promise = Promise.promise();
        JsonArray params = new JsonArray()
                .add(badgeOwner.getUserId())
                .add(typeId);

        String request = String.format(" SELECT DISTINCT(assignor_id) as id, bav.created_at " +
                        " FROM %s bav INNER JOIN %s bp on bp.id = bav.badge_id " +
                        " WHERE owner_id = ? AND badge_type_id = ? " +
                        " ORDER BY bav.created_at DESC %s", BADGE_ASSIGNED_VALID_TABLE,
                DefaultBadgeService.BADGE_PUBLIC_TABLE, SqlHelper.addLimitOffset(limit, offset, params));

        sql.prepared(request, params,
                SqlResult.validResultHandler(PromiseHelper.handler(promise,
                        String.format("[Minibadge@%s::getBadgeTypeAssignerIdsRequest] " +
                                        "Fail to retrieve badge types assigners",
                                this.getClass().getSimpleName()))));

        return promise.future();
    }

    @Override
    public Future<Integer> getTotalReceivers(long typeId) {
        Promise<Integer> promise = Promise.promise();

        getTotalUsersRequest(typeId, null, true)
                .onSuccess(result -> promise.complete(SqlHelper.getResultCount(result)))
                .onFailure(promise::fail);

        return promise.future();
    }
    @Override
    public Future<Integer> getTotalAssigners(long typeId, UserInfos badgeOwner) {
        Promise<Integer> promise = Promise.promise();

        getTotalUsersRequest(typeId, badgeOwner, false)
                .onSuccess(result -> promise.complete(SqlHelper.getResultCount(result)))
                .onFailure(promise::fail);

        return promise.future();
    }

    private Future<JsonObject> getTotalUsersRequest(long typeId, UserInfos badgeOwner, boolean isReceiver) {
        Promise<JsonObject> promise = Promise.promise();

        JsonArray params = new JsonArray()
                .add(typeId);

        String request = String.format(" SELECT COUNT(DISTINCT %s) as count " +
                        " FROM %s b INNER JOIN %s ba on b.id = ba.badge_id WHERE b.badge_type_id = ? %s",
                isReceiver ? "b.owner_id" : "ba.assignor_id",
                BADGE_ASSIGNABLE_TABLE,
                BADGE_ASSIGNED_VALID_TABLE,
                filterOwnerId(badgeOwner, params));

        sql.prepared(request, params,
                SqlResult.validUniqueResultHandler(PromiseHelper.handler(promise,
                        String.format("[Minibadge@%s::getTotalAssignationsRequest] " +
                                        "Fail to retrieve owner total assignations",
                                this.getClass().getSimpleName()))));

        return promise.future();
    }

    private String filterOwnerId(UserInfos badgeOwner, JsonArray params) {
        if (badgeOwner != null) {
            params.add(badgeOwner.getUserId());
            return "AND b.owner_id = ?";
        }
        return "";
    }

    @Override
    public Future<Integer> countBadgeTypeAssigners(long typeId, UserInfos badgeOwner) {
        Promise<Integer> promise = Promise.promise();

        countBadgeTypeAssignerIdsRequest(typeId, badgeOwner)
                .onSuccess(result -> promise.complete(SqlHelper.getResultCount(result)))
                .onFailure(promise::fail);

        return promise.future();
    }


    private Future<JsonObject> countBadgeTypeAssignerIdsRequest(long typeId, UserInfos badgeOwner) {
        Promise<JsonObject> promise = Promise.promise();
        JsonArray params = new JsonArray()
                .add(badgeOwner.getUserId())
                .add(typeId);

        String request = String.format(" SELECT COUNT(DISTINCT(assignor_id)) " +
                        " FROM %s bav INNER JOIN %s bp on bp.id = bav.badge_id " +
                        " WHERE owner_id = ? AND badge_type_id = ?", BADGE_ASSIGNED_VALID_TABLE,
                DefaultBadgeService.BADGE_PUBLIC_TABLE);

        sql.prepared(request, params,
                SqlResult.validUniqueResultHandler(PromiseHelper.handler(promise,
                        String.format("[Minibadge@%s::countBadgeTypeAssignerIdsRequest] " +
                                        "Fail to retrieve badge types assigners",
                                this.getClass().getSimpleName()))));

        return promise.future();
    }

    @Override
    public Future<JsonArray> revoke(String userId, long badgeId) {
        Promise<JsonArray> promise = Promise.promise();

        JsonArray params = new JsonArray();
        params.add(badgeId)
                .add(userId);

        String request = "UPDATE " + BADGE_ASSIGNED_TABLE +
                " SET revoked_at = NOW ()" +
                " WHERE id = ? and assignor_id = ? ; ";

        sql.prepared(request, params, SqlResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::getBadgesTypesRequest] Fail to revoke badge",
                        this.getClass().getSimpleName()))));
        return promise.future();
    }
}
