package fr.cgi.minibadge.service.impl;

import fr.cgi.minibadge.Minibadge;
import fr.cgi.minibadge.core.constants.Database;
import fr.cgi.minibadge.helper.PromiseHelper;
import fr.cgi.minibadge.helper.SqlHelper;
import fr.cgi.minibadge.model.Statistics;
import fr.cgi.minibadge.service.StatisticService;
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

    public DefaultStatisticService(Sql sql) {
        this.sql = sql;
    }

    @Override
    public Future<Statistics> getStatistics() {
        return this.getStatistics(null);
    }

    @Override
    public Future<Statistics> getStatistics(List<String> structureIds) {
        Promise<Statistics> promise = Promise.promise();
        Statistics statistics = new Statistics();

        countBadgeAssigned(structureIds)
                .onSuccess(countBadgeAssigned -> {
                    statistics.setCountBadgeAssigned(countBadgeAssigned);
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
                String.format("[Minibadge@%s::getBadgesTypesRequest] Fail to count badge assigned",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }
}
