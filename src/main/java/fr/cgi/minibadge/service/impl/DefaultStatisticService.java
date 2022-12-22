package fr.cgi.minibadge.service.impl;

import fr.cgi.minibadge.Minibadge;
import fr.cgi.minibadge.core.constants.Database;
import fr.cgi.minibadge.core.constants.Field;
import fr.cgi.minibadge.helper.PromiseHelper;
import fr.cgi.minibadge.helper.SqlHelper;
import fr.cgi.minibadge.model.*;
import fr.cgi.minibadge.service.StatisticService;
import fr.cgi.minibadge.service.StructureService;
import fr.cgi.minibadge.service.UserService;
import io.vertx.core.CompositeFuture;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;
import org.entcore.common.user.UserInfos;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class DefaultStatisticService implements StatisticService {
    public static final String BADGE_ASSIGNED_STRUCTURE_TABLE = String.format("%s.%s", Minibadge.dbSchema, Database.BADGE_ASSIGNED_STRUCTURE);
    private final Sql sql;
    private final Config config;
    private final UserService userService;
    private final StructureService structureService;


    public DefaultStatisticService(Sql sql, Config config, UserService userService, StructureService structureService) {
        this.sql = sql;
        this.config = config;
        this.userService = userService;
        this.structureService = structureService;
    }

    @Override
    public Future<Statistics> getGlobalStatistics() {
        return this.getGlobalStatistics(null);
    }

    @Override
    public Future<Statistics> getGlobalStatistics(List<String> structureIds) {
        Promise<Statistics> promise = Promise.promise();
        Statistics statistics = new Statistics();

        Future<JsonObject> countBadgeAssignedFuture = countBadgeAssigned(structureIds);
        Future<JsonArray> mostAssignedTypesFuture = badgeTypesWithCountAssigned(structureIds, true,
                config.mostAssignedTypeListSize());
        Future<JsonArray> lessAssignedTypesFuture = badgeTypesWithCountAssigned(structureIds,
                config.lessAssignedTypeListSize());
        Future<JsonArray> mostRefusedTypesFuture = refusedBadgeTypesWithCount(structureIds);

        CompositeFuture.all(countBadgeAssignedFuture, mostAssignedTypesFuture, lessAssignedTypesFuture,
                        mostRefusedTypesFuture)
                .compose(result -> {
                    statistics.setCountBadgeAssigned(countBadgeAssignedFuture.result());
                    statistics.setMostAssignedTypes(mostAssignedTypesFuture.result());
                    statistics.setLessAssignedTypes(lessAssignedTypesFuture.result());
                    statistics.setMostRefusedTypes(mostRefusedTypesFuture.result());

                    return CompositeFuture.all(setUsersOnFirstMostAssignedType(statistics, structureIds),
                            setStructures(statistics, structureIds));
                })
                .onSuccess(result -> promise.complete(statistics))
                .onFailure(promise::fail);


        return promise.future();
    }

    public Future<Statistics> getSpecificStructuresStatistics() {
        return this.getSpecificStructuresStatistics(null);
    }

    @Override
    public Future<Statistics> getSpecificStructuresStatistics(List<String> structureIds) {
        Promise<Statistics> promise = Promise.promise();
        Statistics statistics = new Statistics();

        Future<JsonObject> countBadgeAssignedFuture = countBadgeAssigned(structureIds);
        Future<JsonArray> mostAssignedTypesFuture = badgeTypesWithCountAssigned(structureIds, true,
                config.mostAssignedTypeListSize());
        Future<JsonArray> lessAssignedTypesFuture = badgeTypesWithCountAssigned(structureIds,
                config.lessAssignedTypeListSize());
        Future<JsonArray> mostRefusedTypesFuture = refusedBadgeTypesWithCount(structureIds);


        Future<JsonArray> topAssigningUsersFuture = listTopUsersWithCount(structureIds, true,
                config.topAssigningUserListSize());
        Future<JsonArray> topReceivingUserFuture = listTopUsersWithCount(structureIds, false,
                config.topReceivingUserListSize());

        List<User> mostAssigningUsersCounts = new ArrayList<>();

        CompositeFuture.all(countBadgeAssignedFuture, mostAssignedTypesFuture, lessAssignedTypesFuture,
                        mostRefusedTypesFuture, topAssigningUsersFuture, topReceivingUserFuture)
                .compose(result -> {
                    statistics.setCountBadgeAssigned(countBadgeAssignedFuture.result());
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
                .onSuccess(users -> {
                    mergeUsersToStatistics(statistics, users, mostAssigningUsersCounts);
                    promise.complete(statistics);
                })
                .onFailure(promise::fail);


        return promise.future();
    }

    private Future<JsonObject> countBadgeAssigned(List<String> structureIds) {
        Promise<JsonObject> promise = Promise.promise();

        JsonArray params = new JsonArray();
        String request = String.format("SELECT COUNT(DISTINCT (ba.id)) FROM %s bas " +
                        " INNER JOIN %s ba on ba.id = bas.badge_assigned_id " +
                        " INNER JOIN %s b on b.id = ba.badge_id " +
                        " WHERE is_structure_assigner IS TRUE AND %s", BADGE_ASSIGNED_STRUCTURE_TABLE,
                DefaultBadgeAssignedService.BADGE_ASSIGNED_VALID_TABLE,
                DefaultBadgeService.BADGE_ASSIGNABLE_TABLE,
                SqlHelper.filterStructuresWithNull(structureIds, params));


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
                        " bt.description, COALESCE(b.count_assigned, 0) as count_assigned " +
                        " FROM %s bt LEFT JOIN (SELECT b.badge_type_id, COUNT(DISTINCT (ba.id)) as count_assigned " +
                        " FROM %s b INNER JOIN %s ba on b.id = ba.badge_id " +
                        " INNER JOIN %s bas on ba.id = bas.badge_assigned_id " +
                        " WHERE is_structure_assigner IS TRUE %s " +
                        " GROUP BY b.badge_type_id) b on bt.id = b.badge_type_id WHERE %s " +
                        " GROUP BY bt.id, b.count_assigned ORDER BY count_assigned %s LIMIT %s",
                DefaultBadgeTypeService.BADGE_TYPE_TABLE,
                DefaultBadgeService.BADGE_ASSIGNABLE_TABLE,
                DefaultBadgeAssignedService.BADGE_ASSIGNED_VALID_TABLE,
                BADGE_ASSIGNED_STRUCTURE_TABLE,
                SqlHelper.andFilterStructures(structureIds, params),
                SqlHelper.filterStructuresWithNull(structureIds, params),
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
                        " bt.description, COALESCE(b.count_refused, 0) as count_refused " +
                        " FROM %s bt LEFT JOIN (SELECT b.badge_type_id, COUNT(DISTINCT (b.id)) as count_refused " +
                        " FROM %s b INNER JOIN %s ba on b.id = ba.badge_id " +
                        " INNER JOIN %s bas on ba.id = bas.badge_assigned_id " +
                        " WHERE is_structure_receiver IS TRUE %s " +
                        " GROUP BY b.badge_type_id) b on bt.id = b.badge_type_id WHERE %s " +
                        " GROUP BY bt.id, b.count_refused  ORDER BY count_refused DESC LIMIT %s",
                DefaultBadgeTypeService.BADGE_TYPE_TABLE,
                DefaultBadgeService.BADGE_DISABLED_TABLE,
                DefaultBadgeAssignedService.BADGE_ASSIGNED_VALID_TABLE,
                BADGE_ASSIGNED_STRUCTURE_TABLE,
                SqlHelper.andFilterStructures(structureIds, params),
                SqlHelper.filterStructuresWithNull(structureIds, params),
                config.mostRefusedTypeListSize());


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
                    config.mostAssigningUserListSize())
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
                DefaultBadgeAssignedService.BADGE_ASSIGNED_VALID_TABLE,
                BADGE_ASSIGNED_STRUCTURE_TABLE,
                DefaultBadgeService.BADGE_ASSIGNABLE_TABLE,
                DefaultBadgeTypeService.BADGE_TYPE_TABLE,
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

                    userResult.setCountAssigned(assigningUser.countAssigned());
                    return userResult;
                })
                .collect(Collectors.toList());
    }

    private Future<Statistics> setStructures(Statistics statistics, List<String> structureIds) {
        Promise<Statistics> promise = Promise.promise();
        List<Structure> mostAssigningStructuresCounts = new ArrayList<>();
        listMostAssigningStructuresWithCount(structureIds)
                .compose(structures -> {
                    mostAssigningStructuresCounts.addAll(new Structure().toList(structures));
                    return structureService.getStructures(mostAssigningStructuresCounts.stream()
                            .map(Structure::id).collect(Collectors.toList()));
                })
                .onSuccess(mostAssigningStructures -> {
                    mergeMostAssigningStructuresWithCounts(mostAssigningStructures, mostAssigningStructuresCounts);
                    statistics.setMostAssigningStructures(mostAssigningStructures);
                    promise.complete(statistics);
                })
                .onFailure(promise::fail);
        return promise.future();
    }

    private Future<JsonArray> listMostAssigningStructuresWithCount(List<String> structureIds) {
        Promise<JsonArray> promise = Promise.promise();

        JsonArray params = new JsonArray();
        String request = String.format("SELECT structure_id, COUNT(DISTINCT badge_assigned_id) as count_assigned " +
                        " FROM %s WHERE is_structure_assigner IS TRUE %s GROUP BY structure_id " +
                        " ORDER BY count_assigned DESC LIMIT %s",
                BADGE_ASSIGNED_STRUCTURE_TABLE,
                SqlHelper.andFilterStructures(structureIds, params),
                config.mostAssigningStructureListSize());


        sql.prepared(request, params, SqlResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::listMostAssigningStructuresWithCount] Fail to list refused types with " +
                                "count refused",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

    private void mergeMostAssigningStructuresWithCounts(List<Structure> mostAssigningStructures,
                                                        List<Structure> mostAssigningStructuresCounts) {
        mostAssigningStructures.forEach(assigningStructure ->
                mostAssigningStructuresCounts.stream()
                        .filter(structure -> structure.id().equals(assigningStructure.id()))
                        .findFirst()
                        .ifPresent(user -> assigningStructure.setCountAssigned(user.countAssigned())));
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
