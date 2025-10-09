package fr.openent.minibadge.repository.impl;

import fr.openent.minibadge.core.enums.SqlTable;
import fr.openent.minibadge.helper.LoggerHelper;
import fr.openent.minibadge.helper.ModelHelper;
import fr.openent.minibadge.model.entity.BadgeTypeSetting;
import fr.openent.minibadge.repository.BadgeTypeSettingRepository;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;

import java.util.Optional;

public class DefaultBadgeTypeSettingRepository implements BadgeTypeSettingRepository {

    private final Sql sql = Sql.getInstance();

    @Override
    public Future<Optional<BadgeTypeSetting>> findByBadgeTypeId(long badgeTypeId) {
        Promise<Optional<BadgeTypeSetting>> promise = Promise.promise();

        String query = "SELECT * FROM " + SqlTable.BADGE_TYPE_SETTING.getName() + " WHERE badge_type_id = ?";

        JsonArray params = new JsonArray().add(badgeTypeId);

        String errorMessage = "Error while fetching badge type setting with badgeTypeId: " + badgeTypeId;
        String completeLog = LoggerHelper.getCompleteLog(this, "findByBadgeTypeId", errorMessage);
        sql.prepared(query, params, SqlResult.validUniqueResultHandler(ModelHelper.sqlUniqueResultToModel(promise, BadgeTypeSetting.class, completeLog)));

        return promise.future();
    }
}
