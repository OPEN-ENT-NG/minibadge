package fr.openent.minibadge.repository.impl;

import fr.openent.minibadge.core.enums.SqlTable;
import fr.openent.minibadge.helper.LoggerHelper;
import fr.openent.minibadge.helper.ModelHelper;
import fr.openent.minibadge.helper.SqlHelper;
import fr.openent.minibadge.model.BadgeTypeSetting;
import fr.openent.minibadge.repository.BadgeTypeSettingRepository;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;

import java.util.List;
import java.util.Optional;

public class DefaultBadgeTypeSettingRepository implements BadgeTypeSettingRepository {

    private final Sql sql = Sql.getInstance();

    @Override
    public Future<Optional<BadgeTypeSetting>> findByBadgeTypeId(long badgeTypeId, List<String> structureIds) {
        Promise<Optional<BadgeTypeSetting>> promise = Promise.promise();

        // `badgeTypeId` is added first so it matches the leading `?`, before
        // `filterStructuresWithNull` appends its own parameters.
        JsonArray params = new JsonArray().add(badgeTypeId);
        String structureFilter = SqlHelper.filterStructuresWithNull(structureIds, params);

        // Same precedence rule as DefaultBadgeProtagonistSettingRepository: a structure-scoped row
        // wins over the centralized one. The explicit LIMIT 1 is what makes the
        // `validUniqueResultHandler` below actually correct once a badge type has both rows.
        //
        // Same caveat as there: among SEVERAL structure-scoped rows the tie-break is arbitrary-but-
        // deterministic (smallest `structure_id`, then `id`), not "the structure the user is acting
        // in" — that context never reaches this repository. A user belonging to two structures that
        // each configured this badge type is therefore an unhandled edge case; it is outside the
        // stated rule ("establishment beats centralized") and unreachable with the current UI.
        String query = "SELECT * FROM " + SqlTable.BADGE_TYPE_SETTING.getName() + " " +
                "WHERE badge_type_id = ? AND " + structureFilter + " " +
                "ORDER BY structure_id NULLS LAST, id LIMIT 1";

        String errorMessage = "Error while fetching badge type setting with badgeTypeId: " + badgeTypeId;
        String completeLog = LoggerHelper.getCompleteLog(this, "findByBadgeTypeId", errorMessage);
        sql.prepared(query, params, SqlResult.validUniqueResultHandler(ModelHelper.sqlUniqueResultToModel(promise, BadgeTypeSetting.class, completeLog)));

        return promise.future();
    }
}
