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
import java.util.Objects;
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
        if (ownerIds == null || ownerIds.isEmpty()) return Future.succeededFuture();

        Promise<Void> promise = Promise.promise();
        // createBadges only upserts the owners and their (owner, type) badge rows (ON CONFLICT DO
        // NOTHING), and it must run first: the assignment references those rows. So a refused
        // assignment (expired type, still-active assignment) may leave such a badge row behind, with no
        // assignment attached — the same state as before Epic C, and invisible everywhere (every read
        // path joins badge_assigned*). Every Epic C decision is taken by the INSERT statement itself.
        badgeService.createBadges(typeId, ownerIds)
                .compose(v -> createBadgeAssignedRequest(typeId, ownerIds, assignor))
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
                " ba.created_at as created_at , ba.expires_at, " + isExpiredColumn("ba") + ", " +
                " bt.picture_id , us.display_name ," +
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


    /**
     * ONE statement decides and writes, so nothing can change between "may this be assigned" and the
     * INSERT (a double click, a retry, or an admin changing the end date meanwhile):
     * <ul>
     *   <li>{@code setting}: the end date of the badge_type_setting row that applies to the assignor —
     *   establishment row first, central one otherwise, the exact precedence of
     *   {@code DefaultBadgeTypeSettingRepository#findByBadgeTypeId} (which UsersAssignRight used to
     *   authorize this very assignment). No row = permanent.</li>
     *   <li>{@code checks}: {@code type_expired} (end date strictly before {@code CURRENT_DATE}: the
     *   end day itself is still valid; the DATABASE clock decides, never the JVM's) and
     *   {@code already_assigned} (this assignor still holds an ACTIVE assignment on one of the target
     *   badges — an expired one is not in badge_assigned_active and does not block re-awarding).</li>
     *   <li>{@code inserted}: all or nothing — rows are written only when both flags are false, with
     *   {@code expires_at} frozen to the day after the end date at 00:00 (NULL = permanent).</li>
     * </ul>
     * The final SELECT always returns at least the {@code checks} row (LEFT JOINs), so a refusal is told
     * apart from success without a second query. Under READ COMMITTED two concurrent statements can
     * still both pass {@code already_assigned}; the unique index one_assignment_per_assignor (sql/024)
     * is the backstop for that, and its violation is mapped to {@link #ALREADY_ASSIGNED_ERROR}.
     */
    private Future<List<BadgeAssigned>> createBadgeAssignedRequest(long typeId, List<String> ownerIds,
                                                                   UserInfos assignor) {
        Promise<JsonArray> promise = Promise.promise();

        JsonArray params = new JsonArray().add(typeId);
        String structureFilter = SqlHelper.filterStructuresWithNull(assignor.getStructures(), params, "bts");
        params.add(typeId)
                .addAll(new JsonArray(ownerIds))
                .add(assignor.getUserId())
                .add(assignor.getUserId());

        String request = "WITH setting AS (SELECT (SELECT bts.valid_until FROM " + SqlTable.BADGE_TYPE_SETTING.getName() + " bts" +
                " WHERE bts.badge_type_id = ? AND " + structureFilter +
                " ORDER BY bts.structure_id NULLS LAST, bts.id LIMIT 1) AS valid_until), " +
                " candidates AS (SELECT id AS badge_id, owner_id, badge_type_id FROM " + SqlTable.BADGE_ASSIGNABLE.getName() +
                " WHERE badge_type_id = ? AND owner_id IN " + Sql.listPrepared(ownerIds) + "), " +
                " checks AS (SELECT s.valid_until, " +
                " (s.valid_until IS NOT NULL AND s.valid_until < CURRENT_DATE) AS " + TYPE_EXPIRED + ", " +
                " EXISTS (SELECT 1 FROM " + SqlTable.BADGE_ASSIGNED_ACTIVE.getName() + " baa" +
                " INNER JOIN candidates c ON c.badge_id = baa.badge_id WHERE baa.assignor_id = ?) AS " + ALREADY_ASSIGNED +
                " FROM setting s), " +
                " inserted_badge_assigned AS (INSERT INTO " + SqlTable.BADGE_ASSIGNED.getName() + " (badge_id, assignor_id, expires_at)" +
                " SELECT c.badge_id, ?, (ck.valid_until + 1)::timestamp FROM candidates c CROSS JOIN checks ck" +
                " WHERE NOT ck." + TYPE_EXPIRED + " AND NOT ck." + ALREADY_ASSIGNED + " RETURNING *) " +
                " SELECT ck." + TYPE_EXPIRED + ", ck." + ALREADY_ASSIGNED + ", iba.*, c.badge_type_id, c.owner_id" +
                " FROM checks ck LEFT JOIN inserted_badge_assigned iba ON true" +
                " LEFT JOIN candidates c ON c.badge_id = iba.badge_id";

        // No error message given to the handler: PromiseHelper would replace the raw SQL error with it,
        // and the unique-violation case below needs that raw text to be recognised.
        sql.prepared(request, params, SqlResult.validResultHandler(PromiseHelper.handler(promise)));

        return promise.future()
                .recover(err -> {
                    if (SqlHelper.isUniqueViolation(err.getMessage())) {
                        LoggerHelper.logError(this, "createBadgeAssignedRequest",
                                "Concurrent assignment refused by one_assignment_per_assignor for badge type " + typeId,
                                err.getMessage());
                        return Future.failedFuture(ALREADY_ASSIGNED_ERROR);
                    }
                    LoggerHelper.logError(this, "createBadgeAssignedRequest",
                            "Fail to create badge assigned for badge type " + typeId, err.getMessage());
                    return Future.failedFuture(String.format("[Minibadge@%s::createBadgeAssignedRequest] Fail to create badge assigned",
                            this.getClass().getSimpleName()));
                })
                .compose(rows -> {
                    JsonObject checks = rows.isEmpty() ? new JsonObject() : rows.getJsonObject(0);
                    if (Boolean.TRUE.equals(checks.getBoolean(TYPE_EXPIRED))) {
                        return Future.failedFuture(BADGE_TYPE_EXPIRED_ERROR);
                    }
                    if (Boolean.TRUE.equals(checks.getBoolean(ALREADY_ASSIGNED))) {
                        return Future.failedFuture(ALREADY_ASSIGNED_ERROR);
                    }
                    // Nothing inserted (e.g. every target badge is refused/disabled) comes back as a
                    // single checks row with a NULL id: skip it.
                    JsonArray inserted = new JsonArray();
                    rows.stream()
                            .filter(JsonObject.class::isInstance)
                            .map(JsonObject.class::cast)
                            .filter(row -> row.getValue(ID) != null)
                            .forEach(inserted::add);
                    return Future.succeededFuture(new BadgeAssigned().toList(inserted));
                });
    }

    /**
     * Server-side expiry flag, so the client never has to parse a timezone-less timestamp against its
     * own clock: same rule as badge_assigned_active ({@code expires_at > now()} is active).
     */
    private static String isExpiredColumn(String alias) {
        return String.format("(%1$s.expires_at IS NOT NULL AND %1$s.expires_at <= now()) AS %2$s", alias, IS_EXPIRED);
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
                        " ORDER BY bav.created_at DESC %s", SqlTable.BADGE_ASSIGNED_ACTIVE.getName(),
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
                        " WHERE owner_id = ? AND badge_type_id = ?", SqlTable.BADGE_ASSIGNED_ACTIVE.getName(),
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
                        "JOIN " + SqlTable.BADGE_ASSIGNED_ACTIVE.getName() + " ba ON ba.badge_id = b.id " +
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
        String transformedSortBy = Objects.equals(sortBy, RECEIVER_DISPLAY_NAME) ? "receiver_us.display_name" :
                Objects.equals(sortBy, ASSIGNOR_DISPLAY_NAME) ? "assignor_us.display_name" : sortBy;
        List<String> columns = Arrays.asList("receiver_us.display_name", "assignor_us.display_name", "bt.label");
        JsonArray params = new JsonArray();
        params.addAll(new JsonArray(structureIds));
        boolean hasDates = startDate != null && endDate != null;
        boolean hasSort = sortBy != null && sortAsc != null;
        if (hasDates) {
            params.add(startDate);
            params.add(endDate);
        }
        // Still read from badge_assigned_valid (non-revoked, expired included: this is the admin's
        // history). That view deliberately carries no expires_at (it is left untouched so quotas and
        // statistics keep their meaning), hence the primary-key join back to the table for it.
        String request = "SELECT bav.id, bav.badge_id, bav.assignor_id, bav.created_at, " +
                " ba.expires_at, " + isExpiredColumn("ba") + ", " +
                " bt.picture_id , receiver_us.display_name , assignor_us.display_name as " + ASSIGNOR_DISPLAY_NAME + "," +
                " bt.label as label, badge.owner_id " +
                ", badge.id as " + BADGE_ID + " , bt.id as  " + BADGE_TYPE_ID +
                " FROM " + SqlTable.BADGE_ASSIGNED_VALID.getName() + " as bav " +
                " INNER JOIN " + SqlTable.BADGE_ASSIGNED.getName() + " as ba " +
                " ON ba.id = bav.id " +
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
                ((hasSort && acceptedSort.contains(sortBy)) ? transformedSortBy + (sortAsc ? " ASC " : " DESC ") : " bav.id DESC") +
                " ; ";

        sql.prepared(request, params, SqlResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::getAllAssignedBadgesRequest] Fail to retrieve all assigned badges",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

}
