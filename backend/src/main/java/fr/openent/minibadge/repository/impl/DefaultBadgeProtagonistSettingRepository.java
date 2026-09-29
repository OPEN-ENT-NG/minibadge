package fr.openent.minibadge.repository.impl;

import fr.openent.minibadge.core.enums.SqlTable;
import fr.openent.minibadge.helper.LoggerHelper;
import fr.openent.minibadge.helper.ModelHelper;
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
    public Future<List<BadgeProtagonistSettingRow>> findByBadgeTypeId(long badgeTypeId) {
        Promise<List<BadgeProtagonistSettingRow>> promise = Promise.promise();

        String query =
                "SELECT bps.id, bps.protagonist_type_id, bps.protagonist_type " +
                "FROM " + SqlTable.BADGE_PROTAGONIST_SETTING.getName() + " bps " +
                "INNER JOIN " + SqlTable.BADGE_TYPE_SETTING.getName() + " bts " +
                    "ON bps.badge_type_setting_id = bts.id " +
                "WHERE bts.badge_type_id = ? AND bts.structure_id IS NULL";

        JsonArray params = new JsonArray().add(badgeTypeId);

        String errorMessage = "Error while getting badge protagonist settings for badge type id = " + badgeTypeId;
        String completeLog = LoggerHelper.getCompleteLog(this, "findByBadgeTypeId", errorMessage);
        sql.prepared(query, params, SqlResult.validResultHandler(ModelHelper.sqlResultToModel(promise, BadgeProtagonistSettingRow.class, completeLog)));

        return promise.future();
    }
}
