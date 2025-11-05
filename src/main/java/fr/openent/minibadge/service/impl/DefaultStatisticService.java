package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.Minibadge;
import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.core.enums.SqlTable;
import fr.openent.minibadge.helper.LoggerHelper;
import fr.openent.minibadge.helper.PromiseHelper;
import fr.openent.minibadge.helper.SqlHelper;
import fr.openent.minibadge.model.*;
import fr.openent.minibadge.service.ServiceRegistry;
import fr.openent.minibadge.service.StatisticService;
import fr.openent.minibadge.service.StructureService;
import fr.openent.minibadge.service.UserService;
import io.vertx.core.CompositeFuture;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;
import org.entcore.common.user.UserInfos;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class DefaultStatisticService implements StatisticService {

    private static final StatisticService instance = new DefaultStatisticService();
    private DefaultStatisticService() {}
    public static StatisticService getInstance() {
        return instance;
    }

    private final Sql sql = Sql.getInstance();
    private final UserService userService = ServiceRegistry.getService(UserService.class);
    private final StructureService structureService = ServiceRegistry.getService(StructureService.class);

    @Override
    public Future<Statistics> getSpecificStructuresStatistics(List<String> structureIds, LocalDate minDate) {
        Promise<Statistics> promise = Promise.promise();
        Statistics statistics = new Statistics();

        Future<JsonObject> countBadgeAssignedFuture = countBadgeAssigned(structureIds, minDate);
        Future<JsonObject> countActiveUsersFuture = countActiveUsersFromStructureIds(structureIds, minDate);
        Future<JsonArray> mostAssignedTypesFuture = badgeTypesWithCountAssigned(structureIds, true,
                Minibadge.minibadgeConfig.mostAssignedTypeListSize());
        Future<JsonArray> lessAssignedTypesFuture = badgeTypesWithCountAssigned(structureIds,
                Minibadge.minibadgeConfig.lessAssignedTypeListSize());
        Future<JsonArray> mostRefusedTypesFuture = refusedBadgeTypesWithCount(structureIds);


        Future<JsonArray> topAssigningUsersFuture = listTopUsersWithCount(structureIds, true,
                Minibadge.minibadgeConfig.topAssigningUserListSize());
        Future<JsonArray> topReceivingUserFuture = listTopUsersWithCount(structureIds, false,
                Minibadge.minibadgeConfig.topReceivingUserListSize());

        List<User> mostAssigningUsersCounts = new ArrayList<>();

        List<Future<?>> futures = Arrays.asList(
                countBadgeAssignedFuture,
                countActiveUsersFuture,
                mostAssignedTypesFuture,
                lessAssignedTypesFuture,
                mostRefusedTypesFuture,
                topAssigningUsersFuture,
                topReceivingUserFuture
        );

        Future.all(futures)
                .compose(result -> {
                    statistics.setCountBadgeAssigned(countBadgeAssignedFuture.result());
                    statistics.setCountActiveUsers(countActiveUsersFuture.result());
                    statistics.setMostAssignedTypes(mostAssignedTypesFuture.result());
                    statistics.setLessAssignedTypes(lessAssignedTypesFuture.result());
                    statistics.setMostRefusedTypes(mostRefusedTypesFuture.result());
                    statistics.setTopAssigningUsers(topAssigningUsersFuture.result());
                    statistics.setTopReceivingUsers(topReceivingUserFuture.result());

                    return getFirstMostAssignedTypeUsers(statistics, structureIds);
                })
                .compose(users -> {
                    mostAssigningUsersCounts.addAll(users);
                    return getUsersFromCountsList(statistics.topAssigningUsers(), statistics.topReceivingUsers(),
                            mostAssigningUsersCounts);
                })
                .compose(users -> {
                    mergeUsersToStatistics(statistics, users, mostAssigningUsersCounts);
                    return setStructures(statistics, structureIds, minDate);
                })
                .onSuccess(promise::complete)
                .onFailure(err -> {
                    String errorMessage = "Fail to get specific structures statistics";
                    LoggerHelper.logError(this, "getSpecificStructuresStatistics", errorMessage, err.getMessage());
                    promise.fail(err);
                });

        return promise.future();
    }

    private Future<JsonObject> countBadgeAssigned(List<String> structureIds, LocalDate minDate) {
        Promise<JsonObject> promise = Promise.promise();

        JsonArray params = new JsonArray();
        String request = String.format("SELECT COUNT(DISTINCT (ba.id)) FROM %s bas " +
                        " INNER JOIN %s ba on ba.id = bas.badge_assigned_id " +
                        " INNER JOIN %s b on b.id = ba.badge_id " +
                        " WHERE is_structure_assigner IS TRUE AND %s ",
                        SqlTable.BADGE_ASSIGNED_STRUCTURE.getName(),
                        SqlTable.BADGE_ASSIGNED_VALID.getName(),
                        SqlTable.BADGE.getName(),
                SqlHelper.filterStructuresWithNull(structureIds, params));

        if (minDate != null) {
            LocalDateTime minDateTime = minDate.atStartOfDay();
            request += " AND bas.created_at > ?";
            params.add(minDateTime.toString());
        }

        sql.prepared(request, params, SqlResult.validUniqueResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::countBadgeAssigned] Fail to count badge assigned",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

    private Future<JsonArray> badgeTypesWithCountAssigned(List<String> structureIds, Integer limit) {
        return badgeTypesWithCountAssigned(structureIds, null, limit);
    }

    private Future<JsonArray> badgeTypesWithCountAssigned(List<String> structureIds, Boolean isDesc, Integer limit) {
        Promise<JsonArray> promise = Promise.promise();

        JsonArray params = new JsonArray();
        String request = String.format("SELECT bt.id, bt.slug, bt.structure_id, bt.owner_id, bt.picture_id, bt.label, " +
                        " bt.description, bt.description_short, COALESCE(b.count_assigned, 0) as count_assigned " +
                        " FROM %s bt LEFT JOIN (SELECT b.badge_type_id, COUNT(DISTINCT (ba.id)) as count_assigned " +
                        " FROM %s b INNER JOIN %s ba on b.id = ba.badge_id " +
                        " INNER JOIN %s bas on ba.id = bas.badge_assigned_id " +
                        " WHERE is_structure_assigner IS TRUE %s " +
                        " GROUP BY b.badge_type_id) b on bt.id = b.badge_type_id WHERE %s " +
                        " GROUP BY bt.id, b.count_assigned %s " +
                        " ORDER BY count_assigned %s LIMIT %s",
                SqlTable.BADGE_TYPE.getName(),
                SqlTable.BADGE.getName(),
                SqlTable.BADGE_ASSIGNED_VALID.getName(),
                SqlTable.BADGE_ASSIGNED_STRUCTURE.getName(),
                SqlHelper.andFilterStructures(structureIds, params),
                SqlHelper.filterStructuresWithNull(structureIds, params),
                (Boolean.TRUE.equals(isDesc) ? "HAVING count_assigned > 0" : ""),
                (Boolean.TRUE.equals(isDesc) ? "DESC" : ""),
                limit);


        sql.prepared(request, params, SqlResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::listBadgeTypesWithCountAssigned] Fail to list type with count assignations",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

    private Future<JsonArray> refusedBadgeTypesWithCount(List<String> structureIds) {
        Promise<JsonArray> promise = Promise.promise();

        JsonArray params = new JsonArray();
        String request = String.format("SELECT bt.id, bt.slug, bt.structure_id, bt.owner_id, bt.picture_id, bt.label, " +
                        " bt.description, bt.description_short, COALESCE(b.count_refused, 0) as count_refused " +
                        " FROM %s bt LEFT JOIN (SELECT b.badge_type_id, COUNT(DISTINCT (b.id)) as count_refused " +
                        " FROM %s b INNER JOIN %s ba on b.id = ba.badge_id " +
                        " INNER JOIN %s bas on ba.id = bas.badge_assigned_id " +
                        " WHERE is_structure_receiver IS TRUE %s " +
                        " GROUP BY b.badge_type_id) b on bt.id = b.badge_type_id WHERE %s " +
                        " GROUP BY bt.id, b.count_refused HAVING count_refused > 0 ORDER BY count_refused DESC LIMIT %s",
                        SqlTable.BADGE_TYPE.getName(),
                        SqlTable.BADGE_DISABLED.getName(),
                        SqlTable.BADGE_ASSIGNED_VALID.getName(),
                        SqlTable.BADGE_ASSIGNED_STRUCTURE.getName(),
                        SqlHelper.andFilterStructures(structureIds, params),
                        SqlHelper.filterStructuresWithNull(structureIds, params),
                        Minibadge.minibadgeConfig.mostRefusedTypeListSize());


        sql.prepared(request, params, SqlResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::listRefusedBadgeTypesWithCountRefused] Fail to list refused types with " +
                                "count refused",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

    private Future<Statistics> setUsersOnFirstMostAssignedType(Statistics statistics, List<String> structureIds) {
        Promise<Statistics> promise = Promise.promise();
        List<User> mostAssigningUsersCounts = new ArrayList<>();
        if (statistics.mostAssignedTypes().isEmpty()) promise.complete(statistics);
        else {
            BadgeType mostAssignedBadgeType = statistics.mostAssignedTypes().get(0);
            getFirstMostAssignedTypeUsers(statistics, structureIds)
                    .compose(users -> {
                        if (users == null || users.isEmpty()) return Future.succeededFuture(new ArrayList<>());
                        mostAssigningUsersCounts.addAll(users);
                        return userService.getUsers(mostAssigningUsersCounts.stream()
                                .map(UserInfos::getUserId).collect(Collectors.toList()));
                    })
                    .onSuccess(mostAssigningUsers -> {
                        mostAssignedBadgeType.setMostAssigningUsers(
                                setCountsToUsers(mostAssigningUsers, mostAssigningUsersCounts)
                        );
                        promise.complete(statistics);
                    })
                    .onFailure(promise::fail);
        }
        return promise.future();
    }

    private Future<List<User>> getFirstMostAssignedTypeUsers(Statistics statistics, List<String> structureIds) {
        Promise<List<User>> promise = Promise.promise();
        if (statistics.mostAssignedTypes().isEmpty()) promise.complete(new ArrayList<>());
        else {
            BadgeType mostAssignedBadgeType = statistics.mostAssignedTypes().get(0);
            listTopUsersWithCount(structureIds, mostAssignedBadgeType.id(), true,
                    Minibadge.minibadgeConfig.mostAssigningUserListSize())
                    .onSuccess(users -> promise.complete(new User().toList(users)))
                    .onFailure(promise::fail);
        }
        return promise.future();
    }


    private Future<JsonArray> listTopUsersWithCount(List<String> structureIds, boolean isStructureAssigner, Integer limit) {
        return listTopUsersWithCount(structureIds, null, isStructureAssigner, limit);
    }

    private Future<JsonArray> listTopUsersWithCount(List<String> structureIds, Long typeId,
                                                    boolean isStructureAssigner, Integer limit) {
        Promise<JsonArray> promise = Promise.promise();
        String userSelector = (isStructureAssigner ? "ba.assignor_id" : "b.owner_id");

        JsonArray params = new JsonArray();
        String request = String.format("SELECT %s as id, COUNT(DISTINCT ba.id) as count_assigned " +
                        " FROM %s ba INNER JOIN %s bas on ba.id = bas.badge_assigned_id " +
                        " INNER JOIN %s b on b.id = ba.badge_id INNER JOIN %s bt on bt.id = b.badge_type_id " +
                        " WHERE %s IS TRUE %s AND %s %s" +
                        " GROUP BY %s ORDER BY count_assigned DESC " +
                        " LIMIT %s",
                userSelector,
                SqlTable.BADGE_ASSIGNED_VALID.getName(),
                SqlTable.BADGE_ASSIGNED_STRUCTURE.getName(),
                SqlTable.BADGE.getName(),
                SqlTable.BADGE_TYPE.getName(),
                (isStructureAssigner ? Field.IS_STRUCTURE_ASSIGNER : Field.IS_STRUCTURE_RECEIVER),
                SqlHelper.andFilterStructures(structureIds, params, "bas"),
                SqlHelper.filterStructuresWithNull(structureIds, params, "bt"),
                (filterTypeId(typeId, params)),
                userSelector,
                limit);


        sql.prepared(request, params, SqlResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::listRefusedBadgeTypesWithCountRefused] Fail to list refused types with " +
                                "count refused",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

    private String filterTypeId(Long typeId, JsonArray params) {
        if (typeId != null) {
            params.add(typeId);
            return "AND bt.id = ?";
        }
        return "";
    }

    private List<User> setCountsToUsers(List<User> users, List<User> mostAssigningUsersCounts) {
        return mostAssigningUsersCounts.stream()
                .map(assigningUser -> {
                    User userResult = users.stream()
                            .filter(user -> user.getUserId().equals(assigningUser.getUserId()))
                            .findFirst()
                            .orElse(assigningUser);
                    userResult = new User(userResult); //copy user
                    userResult.setCountAssigned(assigningUser.countAssigned());
                    return userResult;
                })
                .collect(Collectors.toList());
    }

    private Future<Statistics> setStructures(Statistics statistics, List<String> structureIds, LocalDate minDate) {
        Promise<Statistics> promise = Promise.promise();
        List<Structure> mostAssigningStructuresCounts = new ArrayList<>();
        listMostAssigningStructuresWithCount(structureIds, minDate)
                .compose(structures -> {
                    mostAssigningStructuresCounts.addAll(new Structure().toList(structures));
                    return structureService.getStructures(mostAssigningStructuresCounts.stream()
                            .map(Structure::id).collect(Collectors.toList()));
                })
                .compose(mostAssigningStructures -> {
                    mergeMostAssigningStructuresWithCounts(mostAssigningStructures, mostAssigningStructuresCounts);

                    statistics.setMostAssigningStructures(mostAssigningStructures);

                    List<Future> activeUsersFutures = mostAssigningStructures.stream()
                            .map(structure -> countActiveUsersFromStructureId(structure.id(), minDate)
                                    .onSuccess(result -> {
                                        Integer count = SqlHelper.getResultCount(result);
                                        structure.setCountActiveUsers(count);
                                    })
                            ).collect(Collectors.toList());

                    return CompositeFuture.all(activeUsersFutures);
                })
                .onSuccess(ok -> promise.complete(statistics))
                .onFailure(promise::fail);
        return promise.future();
    }

    private Future<JsonArray> listMostAssigningStructuresWithCount(List<String> structureIds, LocalDate minDate) {
        Promise<JsonArray> promise = Promise.promise();

        JsonArray params = new JsonArray();
        String request = String.format("SELECT bas.structure_id, COUNT(DISTINCT bas.badge_assigned_id) as count_assigned " +
                        " FROM %s bas INNER JOIN %s ba on bas.badge_assigned_id = ba.id" +
                        " INNER JOIN %s b on ba.badge_id = b.id " +
                        " WHERE is_structure_assigner IS TRUE %s",
                SqlTable.BADGE_ASSIGNED_STRUCTURE.getName(),
                SqlTable.BADGE_ASSIGNED_VALID.getName(),
                SqlTable.BADGE.getName(),
                SqlHelper.andFilterStructures(structureIds, params)
        );

        if (minDate != null) {
            LocalDateTime minDateTime = minDate.atStartOfDay();
            request += " AND bas.created_at > ?";
            params.add(minDateTime.toString());
        }

        request += " GROUP BY bas.structure_id " +
                " ORDER BY count_assigned DESC LIMIT " + Minibadge.minibadgeConfig.mostAssigningStructureListSize();

        sql.prepared(request, params, SqlResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::listMostAssigningStructuresWithCount] Fail to list most assigning structures with count",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

    private Future<JsonObject> countActiveUsersFromStructureId(String structureId, LocalDate minDate) {
        return countActiveUsersFromStructureIds(Collections.singletonList(structureId), minDate);
    }

    private Future<JsonObject> countActiveUsersFromStructureIds(List<String> structureIds, LocalDate minDate) {
        Promise<JsonObject> promise = Promise.promise();

        if (structureIds == null || structureIds.isEmpty()) {
            return Future.succeededFuture(new JsonObject().put(Field.COUNT, 0));
        }

        StringBuilder query = new StringBuilder(
                "SELECT COUNT(DISTINCT user_id) " +
                        "FROM ( " +
                        "  SELECT ba.assignor_id AS user_id " +
                        "  FROM " + SqlTable.BADGE_ASSIGNED_STRUCTURE.getName() + " bas " +
                        "  JOIN " + SqlTable.BADGE_ASSIGNED_VALID.getName() + " ba ON ba.id = bas.badge_assigned_id " +
                        "  WHERE bas.structure_id IN " + Sql.listPrepared(structureIds) +
                        "    AND bas.is_structure_assigner = TRUE"
        );

        JsonArray params = new JsonArray().addAll(new JsonArray(structureIds));

        if (minDate != null) {
            query.append(" AND ba.created_at > ?");
            params.add(minDate.atStartOfDay().toString()); // ISO 8601 string
        }

        query.append(
                " UNION " +
                        "  SELECT b.owner_id AS user_id " +
                        "  FROM " + SqlTable.BADGE_ASSIGNED_STRUCTURE.getName() + " bas " +
                        "  JOIN " + SqlTable.BADGE_ASSIGNED_VALID.getName() + " ba ON ba.id = bas.badge_assigned_id " +
                        "  JOIN " + SqlTable.BADGE.getName() + " b ON b.id = ba.badge_id " +
                        "  WHERE bas.structure_id IN " + Sql.listPrepared(structureIds) +
                        "    AND bas.is_structure_receiver = TRUE"
        );

        params.addAll(new JsonArray(structureIds));

        if (minDate != null) {
            query.append(" AND ba.created_at > ?");
            params.add(minDate.atStartOfDay().toString()); // ISO 8601 string
        }

        query.append(" ) active_users");

        String errorLog = String.format(
                "[Minibadge@%s::countActiveUsersFromStructureIds] Fail to count active users from structure ids",
                this.getClass().getSimpleName()
        );

        sql.prepared(query.toString(), params,
                SqlResult.validUniqueResultHandler(PromiseHelper.handler(promise, errorLog)));

        return promise.future();
    }




    private void mergeMostAssigningStructuresWithCounts(List<Structure> mostAssigningStructures,
                                                        List<Structure> mostAssigningStructuresCounts) {
        mostAssigningStructures.forEach(assigningStructure ->
                mostAssigningStructuresCounts.stream()
                        .filter(structure -> structure.id().equals(assigningStructure.id()))
                        .findFirst()
                        .ifPresent(user -> assigningStructure.setCountAssigned(user.countAssigned())));

        mostAssigningStructures.sort(Comparator.comparing(Structure::countAssigned, Comparator.nullsFirst(Comparator.reverseOrder())));
    }

    private Future<List<User>> getUsersFromCountsList(List<User> topAssigningUsers, List<User> topReceivingUsers,
                                                      List<User> mostAssigningUsersCounts) {
        List<String> userIds = Stream.of(
                        topAssigningUsers.stream().map(UserInfos::getUserId).collect(Collectors.toList()),
                        topReceivingUsers.stream().map(UserInfos::getUserId).collect(Collectors.toList()),
                        mostAssigningUsersCounts.stream().map(UserInfos::getUserId).collect(Collectors.toList())
                )
                .flatMap(Collection::stream)
                .distinct()
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        return userService.getUsers(userIds);
    }

    private void mergeUsersToStatistics(Statistics statistics, List<User> users,
                                        List<User> mostAssigningUsersCounts) {
        if (!statistics.mostAssignedTypes().isEmpty()) {
            BadgeType mostAssignedBadgeType = statistics.mostAssignedTypes().get(0);
            mostAssignedBadgeType.setMostAssigningUsers(
                    setCountsToUsers(users, mostAssigningUsersCounts)
            );
        }
        statistics.setTopAssigningUsers(
                setCountsToUsers(users, statistics.topAssigningUsers())
        );
        statistics.setTopReceivingUsers(
                setCountsToUsers(users, statistics.topReceivingUsers())
        );
    }


}
