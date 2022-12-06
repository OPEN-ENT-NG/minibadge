package fr.cgi.minibadge.service.impl;

import fr.cgi.minibadge.Minibadge;
import fr.cgi.minibadge.core.constants.Database;
import fr.cgi.minibadge.helper.PromiseHelper;
import fr.cgi.minibadge.helper.SqlHelper;
import fr.cgi.minibadge.model.Config;
import fr.cgi.minibadge.model.Statistics;
import fr.cgi.minibadge.service.StatisticService;
import io.vertx.core.CompositeFuture;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;

import java.util.List;

public class DefaultStatisticService implements StatisticService {
    public static final String BADGE_ASSIGNED_STRUCTURE_TABLE = String.format("%s.%s", Minibadge.dbSchema, Database.BADGE_ASSIGNED_STRUCTURE);
    private final Sql sql;
    private final Config config;

    public DefaultStatisticService(Sql sql, Config config) {
        this.sql = sql;
        this.config = config;
    }

    @Override
    public Future<Statistics> getStatistics() {
        return this.getStatistics(null);
    }

    @Override
    public Future<Statistics> getStatistics(List<String> structureIds) {
        Promise<Statistics> promise = Promise.promise();
        Statistics statistics = new Statistics();

        Future<JsonObject> countBadgeAssignedFuture = countBadgeAssigned(structureIds);
        Future<JsonArray> mostAssignedTypesFuture = listBadgeTypesWithCountAssigned(structureIds);
        Future<JsonArray> mostRefusedTypesFuture = listRefusedBadgeTypesWithCountRefused(structureIds);

        CompositeFuture.all(countBadgeAssignedFuture, mostAssignedTypesFuture, mostRefusedTypesFuture)
                .onSuccess(countBadgeAssigned -> {
                    statistics.setCountBadgeAssigned(countBadgeAssignedFuture.result());
                    statistics.setMostAssignedTypes(mostAssignedTypesFuture.result());
                    statistics.setMostRefusedTypes(mostRefusedTypesFuture.result());
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

    private Future<JsonArray> listBadgeTypesWithCountAssigned(List<String> structureIds) {
        Promise<JsonArray> promise = Promise.promise();

        JsonArray params = new JsonArray();
        String request = String.format("SELECT bt.id, bt.slug, bt.structure_id, bt.owner_id, bt.picture_id, bt.label, " +
                        " bt.description, COALESCE(b.count_assigned, 0) as count_assigned " +
                        " FROM %s bt LEFT JOIN (SELECT b.badge_type_id, COUNT(DISTINCT (ba.id)) as count_assigned " +
                        " FROM %s b INNER JOIN %s ba on b.id = ba.badge_id " +
                        " INNER JOIN %s bas on ba.id = bas.badge_assigned_id " +
                        " WHERE is_structure_assigner IS TRUE %s " +
                        " GROUP BY b.badge_type_id) b on bt.id = b.badge_type_id WHERE %s " +
                        " GROUP BY bt.id, b.count_assigned ORDER BY count_assigned DESC LIMIT %s",
                DefaultBadgeTypeService.BADGE_TYPE_TABLE,
                DefaultBadgeService.BADGE_ASSIGNABLE_TABLE,
                DefaultBadgeAssignedService.BADGE_ASSIGNED_VALID_TABLE,
                BADGE_ASSIGNED_STRUCTURE_TABLE,
                SqlHelper.andFilterStructures(structureIds, params),
                SqlHelper.filterStructuresWithNull(structureIds, params),
                config.mostAssignedTypeListSize());


        sql.prepared(request, params, SqlResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::listBadgeTypesWithCountAssigned] Fail to list type with count assignations",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

    private Future<JsonArray> listRefusedBadgeTypesWithCountRefused(List<String> structureIds) {
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
}
