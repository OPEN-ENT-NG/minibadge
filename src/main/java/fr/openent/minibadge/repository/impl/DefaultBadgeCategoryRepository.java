package fr.openent.minibadge.repository.impl;

import fr.openent.minibadge.helper.LoggerHelper;
import fr.openent.minibadge.helper.ModelHelper;
import fr.openent.minibadge.model.entity.BadgeCategory;
import fr.openent.minibadge.repository.BadgeCategoryRepository;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;

import java.util.List;


public class DefaultBadgeCategoryRepository implements BadgeCategoryRepository {

    private final Sql sql = Sql.getInstance();


    @Override
    public Future<List<BadgeCategory>> findByBadgeTypeId(long badgeTypeId) {
        Promise <List<BadgeCategory>> promise = Promise.promise();

        String query =
            "SELECT bc.id, bc.name, bc.slug, bc.icon_name, bc.created_at, bc.updated_at " +
            "FROM minibadge.badge_category bc " +
            "INNER JOIN minibadge.rel_badge_category_badge_type rbcbt " +
                "ON bc.id = rbcbt.badge_category_id " +
            "WHERE rbcbt.badge_type_id = ?";

        JsonArray params = new JsonArray().add(badgeTypeId);

        String errorMessage = "Error while getting badge categories for badge type id = " + badgeTypeId;
        String completeLog = LoggerHelper.getCompleteLog(this, "findByBadgeTypeId", errorMessage);
        sql.prepared(query, params, SqlResult.validResultHandler(ModelHelper.sqlResultToModel(promise, BadgeCategory.class, completeLog)));

        return promise.future();
    }

    @Override
    public Future<List<BadgeCategory>> findAll() {
        Promise <List<BadgeCategory>> promise = Promise.promise();

        String query = "SELECT * FROM minibadge.badge_category";

        String errorMessage = "Error while getting all badge categories";
        String completeLog = LoggerHelper.getCompleteLog(this, "findAll", errorMessage);
        sql.prepared(query, new JsonArray(), SqlResult.validResultHandler(ModelHelper.sqlResultToModel(promise, BadgeCategory.class, completeLog)));

        return promise.future();
    }
}
