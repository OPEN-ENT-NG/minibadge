package fr.openent.minibadge.repository.impl;

import fr.openent.minibadge.core.enums.SqlTable;
import fr.openent.minibadge.helper.LoggerHelper;
import fr.openent.minibadge.helper.ModelHelper;
import fr.openent.minibadge.helper.SqlHelper;
import fr.openent.minibadge.model.BadgeProtagonistSettingRow;
import fr.openent.minibadge.repository.BadgeProtagonistSettingRepository;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;

import java.util.List;

public class DefaultBadgeProtagonistSettingRepository implements BadgeProtagonistSettingRepository {

    private final Sql sql = Sql.getInstance();

    @Override
    public Future<List<BadgeProtagonistSettingRow>> findByBadgeTypeId(long badgeTypeId, List<String> structureIds) {
        Promise<List<BadgeProtagonistSettingRow>> promise = Promise.promise();

        // `badgeTypeId` is added first so it matches the leading `?` of the sub-select, before
        // `filterStructuresWithNull` appends its own parameters.
        JsonArray params = new JsonArray().add(badgeTypeId);
        String structureFilter = SqlHelper.filterStructuresWithNull(structureIds, params);

        // The sub-select resolves the ONE applicable badge_type_setting before joining its
        // protagonists: `ORDER BY structure_id NULLS LAST` puts the structure-scoped row first,
        // so it wins over the centralized one when both exist; `id` keeps the choice deterministic
        // for a user belonging to several structures that each configured this badge type.
        //
        // That `id` tie-break is arbitrary-but-deterministic: when a user belongs to two structures
        // which BOTH configured this badge type, the row picked is simply the one with the smaller
        // `structure_id`/`id`, not the structure the user is currently acting in — which this query
        // is not told. The spec only requires "establishment settings beat centralized ones" and
        // says nothing about ranking several establishments, and no UI currently produces per-
        // structure settings for more than one of a user's structures, so this stays unreachable in
        // practice. Resolving it properly would mean threading the acting structure down to here.
        String query =
                "SELECT bps.id, bps.protagonist_type_id, bps.protagonist_type " +
                "FROM " + SqlTable.BADGE_PROTAGONIST_SETTING.getName() + " bps " +
                "INNER JOIN (" +
                    "SELECT id FROM " + SqlTable.BADGE_TYPE_SETTING.getName() + " " +
                    "WHERE badge_type_id = ? AND " + structureFilter + " " +
                    "ORDER BY structure_id NULLS LAST, id LIMIT 1" +
                ") bts ON bps.badge_type_setting_id = bts.id";

        String errorMessage = "Error while getting badge protagonist settings for badge type id = " + badgeTypeId;
        String completeLog = LoggerHelper.getCompleteLog(this, "findByBadgeTypeId", errorMessage);
        sql.prepared(query, params, SqlResult.validResultHandler(ModelHelper.sqlResultToModel(promise, BadgeProtagonistSettingRow.class, completeLog)));

        return promise.future();
    }
}
