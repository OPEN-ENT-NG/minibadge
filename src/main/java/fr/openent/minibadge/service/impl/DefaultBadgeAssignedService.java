package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.core.enums.SqlTable;
import fr.openent.minibadge.helper.*;
import fr.openent.minibadge.model.BadgeAssigned;
import fr.openent.minibadge.model.User;
import fr.openent.minibadge.service.*;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;
import org.entcore.common.user.UserInfos;
import org.entcore.common.user.UserUtils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import static fr.openent.minibadge.core.constants.Field.*;

public class DefaultBadgeAssignedService implements BadgeAssignedService {

    private static final BadgeAssignedService instance = new DefaultBadgeAssignedService();
    private DefaultBadgeAssignedService() {}
    public static BadgeAssignedService getInstance() {
        return instance;
    }

    private final Sql sql = Sql.getInstance();
    private final BadgeService badgeService = ServiceRegistry.getService(BadgeService.class);
    private final UserService userService = ServiceRegistry.getService(UserService.class);
    private final BadgeAssignedStructureService badgeAssignedStructureService = ServiceRegistry.getService(BadgeAssignedStructureService.class);

    @Override
    public Future<Void> assign(long typeId, List<String> ownerIds, UserInfos assignor) {
        Promise<Void> promise = Promise.promise();
        badgeService
                .createBadges(typeId, ownerIds)
                .compose(badgeResult -> createBadgeAssignedRequest(typeId, ownerIds, assignor))
                .onSuccess(badgeTypes -> {
                    promise.complete();
                    badgeAssignedStructureService.createBadgeAssignedStructures(badgeTypes, ownerIds, assignor);
                })
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
                " FROM " + SqlTable.BADGE_ASSIGNED.getName() + " as ba " +
                " INNER JOIN " + SqlTable.BADGE.getName() + " " +
                " on ba.badge_id = badge.id " +
                " INNER JOIN " + SqlTable.BADGE_TYPE.getName() + " as bt " +
                " on badge.badge_type_id = bt.id " +
                " INNER JOIN " + SqlTable.USER.getName() + " as us " +
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


    private Future<List<BadgeAssigned>> createBadgeAssignedRequest(long typeId,
                                                                   List<String> ownerIds, UserInfos assignor) {
        Promise<List<BadgeAssigned>> promise = Promise.promise();

        String request = "WITH inserted_badge_assigned AS ( " +
                " INSERT INTO " + SqlTable.BADGE_ASSIGNED.getName() + " (badge_id, assignor_id) " +
                " SELECT id as badge_id, ? as assignor_id FROM  " + SqlTable.BADGE_ASSIGNABLE.getName() +
                " WHERE badge_type_id = ? AND owner_id IN " + Sql.listPrepared(ownerIds) + " RETURNING *) " +
                " SELECT iba.*, b.badge_type_id, b.owner_id " +
                " FROM inserted_badge_assigned iba  JOIN " + SqlTable.BADGE_ASSIGNABLE.getName() + " b " +
                " ON iba.badge_id = b.id";

        JsonArray params = new JsonArray()
                .add(assignor.getUserId())
                .add(typeId)
                .addAll(new JsonArray(ownerIds));

        sql.prepared(request, params, SqlResult.validResultHandler(ModelHelper.sqlResultToModel(promise,
                BadgeAssigned.class,
                String.format("[Minibadge@%s::createBadgeAssignedRequest] Fail to create badge assigned",
                        this.getClass().getSimpleName()))));

        return promise.future();
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
                        " ORDER BY bav.created_at DESC %s", SqlTable.BADGE_ASSIGNED_VALID.getName(),
                        SqlTable.BADGE_PUBLIC.getName(), SqlHelper.addLimitOffset(limit, offset, params));

        sql.prepared(request, params,
                SqlResult.validResultHandler(PromiseHelper.handler(promise,
                        String.format("[Minibadge@%s::getBadgeTypeAssignerIdsRequest] " +
                                        "Fail to retrieve badge types assigners",
                                this.getClass().getSimpleName()))));

        return promise.future();
    }

    @Override
    public Future<Integer> countTotalAssigners(long typeId, UserInfos badgeOwner) {
        Promise<Integer> promise = Promise.promise();

        countTotalAssignersRequest(typeId, badgeOwner)
                .onSuccess(result -> promise.complete(SqlHelper.getResultCount(result)))
                .onFailure(promise::fail);

        return promise.future();
    }


    private Future<JsonObject> countTotalAssignersRequest(long typeId, UserInfos badgeOwner) {
        Promise<JsonObject> promise = Promise.promise();
        JsonArray params = new JsonArray()
                .add(badgeOwner.getUserId())
                .add(typeId);

        String request = String.format(" SELECT COUNT(DISTINCT(assignor_id)) " +
                        " FROM %s bav INNER JOIN %s bp on bp.id = bav.badge_id " +
                        " WHERE owner_id = ? AND badge_type_id = ?", SqlTable.BADGE_ASSIGNED_VALID.getName(),
                        SqlTable.BADGE_PUBLIC.getName());

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

        String request = "UPDATE " + SqlTable.BADGE_ASSIGNED.getName() +
                " SET revoked_at = NOW ()" +
                " WHERE id = ? and assignor_id = ? ; ";

        sql.prepared(request, params, SqlResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::getBadgesTypesRequest] Fail to revoke badge",
                        this.getClass().getSimpleName()))));
        return promise.future();
    }

    public Future<Boolean> isSelfAssigned(UserInfos userInfos, long typeId) {
        Promise<Boolean> promise = Promise.promise();

        countTotalSelfAssignedRequest(userInfos.getUserId(), typeId)
                .onSuccess(result -> {
                    int count = SqlHelper.getResultCount(result);
                    promise.complete(count > 0);
                })
                .onFailure(err -> {
                    String errorMessage = String.format("Fail to check self assigned badge for user %s and badge type %d : ",
                            userInfos.getUserId(), typeId);
                    LoggerHelper.logError(this, "isSelfAssigned", errorMessage, err.getMessage());
                    promise.fail(err);
                });

        return promise.future();
    }

    private Future<JsonObject> countTotalSelfAssignedRequest(String userId, long typeId) {
        Promise<JsonObject> promise = Promise.promise();

        JsonArray params = new JsonArray()
                .add(typeId)
                .add(userId)
                .add(userId); // ajouté pour le test assignor_id = owner_id

        String request =
                "SELECT COUNT(*) " +
                        "FROM " + SqlTable.BADGE.getName() + " b " +
                        "JOIN " + SqlTable.BADGE_ASSIGNED_VALID.getName() + " ba ON ba.badge_id = b.id " +
                        "WHERE b.badge_type_id = ? " +
                        "AND b.owner_id = ? " +
                        "AND ba.assignor_id = ?";

        sql.prepared(request, params,
                SqlResult.validUniqueResultHandler(PromiseHelper.handler(promise,
                        String.format("[Minibadge@%s::countTotalSelfAssignedRequest] " +
                                        "Fail to retrieve self assigned badges",
                                this.getClass().getSimpleName()))));

        return promise.future();
    }

    public Future<List<BadgeAssigned>> getAllAssignedBadges(String query, String startDate, String endDate, String sortType, Boolean sortAsc, List<String> structureIds) {
        Promise<List<BadgeAssigned>> promise = Promise.promise();

        getAllAssignedBadgesRequest(startDate, endDate, sortType, sortAsc, query, structureIds)
                .onSuccess(badgesAssigned -> promise.complete(new BadgeAssigned().toList(badgesAssigned)))
                .onFailure(err -> LoggerHelper.logError(this, "getAllAssignedBadges",
                            "Fail to retrieve all assigned badges", err.getMessage())
                );

        return promise.future();
    }

    private Future<JsonArray> getAllAssignedBadgesRequest(String startDate, String endDate,
                                                    String sortBy, Boolean sortAsc, String query, List<String> structureIds) {
        Promise<JsonArray> promise = Promise.promise();
        List<String> acceptedSort = Arrays.asList(LABEL, CREATED_AT, REVOKED_AT, RECEIVER_DISPLAY_NAME, ASSIGNOR_DISPLAY_NAME);
        List<String> columns = Arrays.asList(DISPLAY_NAME, ASSIGNOR_DISPLAY_NAME, LABEL);
        JsonArray params = new JsonArray();
        params.addAll(new JsonArray(structureIds));
        boolean hasDates = startDate != null && endDate != null;
        boolean hasSort = sortBy != null && sortAsc != null;
        if (hasDates) {
            params.add(startDate);
            params.add(endDate);
        }
        String request = "SELECT bav.id, bav.badge_id, bav.assignor_id, " +
                " bt.picture_id , receiver_us.display_name , assignor_us.display_name as " + ASSIGNOR_DISPLAY_NAME + "," +
                " bt.label as label, badge.owner_id " +
                ", badge.id as " + BADGE_ID + " , bt.id as  " + BADGE_TYPE_ID +
                " FROM " + SqlTable.BADGE_ASSIGNED_VALID.getName() + " as bav " +
                " INNER JOIN " + SqlTable.BADGE.getName() +
                " on bav.badge_id = badge.id " +
                " INNER JOIN " + SqlTable.BADGE_TYPE.getName() + " as bt " +
                " on badge.badge_type_id = bt.id " +
                " INNER JOIN " + SqlTable.USER.getName() + " as receiver_us " +
                " ON receiver_us.id = badge.owner_id " +
                " INNER JOIN " + SqlTable.USER.getName() + " as assignor_us " +
                " ON assignor_us.id = bav.assignor_id " +
                " INNER JOIN " + SqlTable.BADGE_ASSIGNED_STRUCTURE.getName() + " as bas " +
                " ON bas.badge_assigned_id = bav.id " +
                " WHERE bas.structure_id IN " + Sql.listPrepared(structureIds) +
                ((hasDates) ? " AND bav.created_at::date  >= to_date(?,'DD-MM-YYYY') " +
                        " AND bav.created_at::date  <= to_date( ?, 'DD-MM-YYYY') " : "") +
                ((query != null && !query.isEmpty()) ? " AND " + SqlHelper.searchQueryInColumns(query, columns, params) : " ") +
                " ORDER BY " +
                ((hasSort && acceptedSort.contains(sortBy)) ? sortBy + (sortAsc ? " ASC " : " DESC ") : " bav.id ") +
                " ; ";

        sql.prepared(request, params, SqlResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::getAllAssignedBadgesRequest] Fail to retrieve all assigned badges",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

}
