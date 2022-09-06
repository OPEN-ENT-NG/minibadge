package fr.cgi.minibadge.service.impl;

import fr.cgi.minibadge.Minibadge;
import fr.cgi.minibadge.core.constants.Database;
import fr.cgi.minibadge.helper.PromiseHelper;
import fr.cgi.minibadge.helper.SqlHelper;
import fr.cgi.minibadge.model.BadgeType;
import fr.cgi.minibadge.service.BadgeTypeService;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;

import java.util.Collections;
import java.util.List;

public class DefaultBadgeTypeService implements BadgeTypeService {

    private final Sql sql;
    private static final String BADGE_TYPE_TABLE = String.format("%s.%s", Minibadge.dbSchema, Database.BADGE_TYPE);

    public DefaultBadgeTypeService(Sql sql) {
        this.sql = sql;
    }

    @Override
    public Future<List<BadgeType>> getBadgeTypes(String structureId, String query, int limit, Integer offset) {
        Promise<List<BadgeType>> promise = Promise.promise();

        JsonArray params = new JsonArray();
        params.add(structureId);

        String request = String.format("SELECT id, slug, structure_id, owner_id, picture_id, label, description " +
                        " FROM %s WHERE (structure_id = ? OR structure_id IS NULL) %s %s %s", BADGE_TYPE_TABLE,
                (query != null && !query.isEmpty()) ? " AND " : "",
                SqlHelper.searchQueryInColumns(query, Collections.singletonList(Database.LABEL), params),
                SqlHelper.addLimitOffset(limit, offset, params));

        Promise<JsonArray> badgeTypesPromise = Promise.promise();
        sql.prepared(request, params, SqlResult.validResultHandler(PromiseHelper.handler(badgeTypesPromise,
                String.format("[Minibadge@%s::getBadgeTypes] Fail to retrieve badge types",
                        this.getClass().getSimpleName()))));

        badgeTypesPromise.future()
                .onSuccess(badgeTypes -> promise.complete(new BadgeType().toList(badgeTypes)))
                .onFailure(promise::fail);

        return promise.future();
    }
}
