package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.core.enums.SqlTable;
import fr.openent.minibadge.helper.LoggerHelper;
import fr.openent.minibadge.helper.PromiseHelper;
import fr.openent.minibadge.helper.SettingHelper;
import fr.openent.minibadge.helper.SqlHelper;
import fr.openent.minibadge.model.BadgeType;
import fr.openent.minibadge.model.TypeSetting;
import fr.openent.minibadge.model.User;
import fr.openent.minibadge.model.BadgeCategory;
import fr.openent.minibadge.service.*;
import fr.wseduc.webutils.I18n;
import fr.wseduc.webutils.Server;
import io.vertx.core.CompositeFuture;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.Vertx;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;
import org.entcore.common.user.UserInfos;
import org.entcore.common.user.UserUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class DefaultBadgeTypeService implements BadgeTypeService {

    private static final BadgeTypeService instance = new DefaultBadgeTypeService();
    private DefaultBadgeTypeService() {}
    public static BadgeTypeService getInstance() {
        return instance;
    }

    private final Sql sql = Sql.getInstance();
    private final BadgeCategoryService badgeCategoryService = ServiceRegistry.getService(BadgeCategoryService.class);
    private final BadgeTypeSettingService badgeTypeSettingService = ServiceRegistry.getService(BadgeTypeSettingService.class);
    private final BadgeProtagonistSettingService badgeProtagonistSettingService = ServiceRegistry.getService(BadgeProtagonistSettingService.class);
    private final BadgeAssignedService badgeAssignedService = ServiceRegistry.getService(BadgeAssignedService.class);

    @Override
    public Future<List<BadgeType>> getBadgeTypes(List<String> structureIds, String query, int limit, Integer offset, Long badgeCategoryId) {
        Promise<List<BadgeType>> promise = Promise.promise();

        getBadgesTypesRequest(structureIds, query, limit, offset, badgeCategoryId)
                .onSuccess(badgeTypesArray -> {
                    List<BadgeType> badgeTypes = new BadgeType().toList(badgeTypesArray);

                    List<Future> categoryFutures = new ArrayList<>();

                    for (BadgeType badgeType : badgeTypes) {
                        Future<List<BadgeCategory>> categoryFuture = badgeCategoryService.getBadgeCategoriesByBadgeTypeId(badgeType.id())
                                .onSuccess(badgeType::setCategories);
                        categoryFutures.add(categoryFuture);
                        categoryFutures.add(getSetting(badgeType));
                    }

                    CompositeFuture.all(categoryFutures)
                            .onSuccess(cf -> promise.complete(badgeTypes))
                            .onFailure(promise::fail);
                })
                .onFailure(promise::fail);

        return promise.future();
    }

    /**
     * Fetches the relations (SQL-backed, async, falls back to SettingHelper.getDefaultTypeSetting()
     * internally when unseeded) and isSelfAssignable, combines them onto badgeType.setting, and
     * returns a Future<Void> so callers can add it to a raw List<Future> alongside other per-badge-type
     * futures (mirrors the previous single settingFuture that only awaited isSelfAssignable).
     */
    private Future<Void> getSetting(BadgeType badgeType) {
        // A genuine failure here (as opposed to the "no rows seeded" case, already handled inside
        // getRelationsSetting) is logged before falling back so a systemic DB issue stays visible.
        Future<TypeSetting> relationsFuture = badgeProtagonistSettingService.getRelationsSetting(badgeType.id())
                .otherwise(err -> {
                    LoggerHelper.logError(this, "getSetting",
                            "Fail to retrieve badge protagonist relations settings for badgeTypeId: " + badgeType.id(),
                            err.getMessage());
                    return SettingHelper.getDefaultTypeSetting();
                });
        Future<Boolean> selfAssignableFuture = badgeTypeSettingService.isBadgeTypeSelfAssignable(badgeType.id());

        return Future.all(relationsFuture, selfAssignableFuture)
                .onSuccess(cf -> badgeType.setSetting(
                        relationsFuture.result().setSelfAssignable(selfAssignableFuture.result())))
                .mapEmpty();
    }

    private Future<JsonArray> getBadgesTypesRequest(List<String> structureIds, String queryText, int limit, Integer offset, Long badgeCategoryId) {
        String functionName = "getBadgesTypesRequest";

        Promise<JsonArray> promise = Promise.promise();

        JsonArray params = new JsonArray();

        // Base SELECT
        String query = "SELECT bt.id, bt.slug, bt.structure_id, bt.owner_id, bt.picture_id, bt.label, bt.description, bt.description_short " +
                "FROM " + SqlTable.BADGE_TYPE.getName() + " bt";

        // Optional JOIN if categoryId is present
        if (badgeCategoryId != null) {
            query += " JOIN " + SqlTable.REL_BADGE_CATEGORY_BADGE_TYPE.getName() + " rbcbt ON bt.id = rbcbt.badge_type_id";
        }

        // WHERE clauses
        query += " WHERE (";
        query += SqlHelper.filterStructures(structureIds, params);
        if (structureIds != null && !structureIds.isEmpty()) {
            query += " OR ";
        }
        query += "bt.structure_id IS NULL)";

        // Optional text search
        if (queryText != null && !queryText.isEmpty()) {
            query += " AND " + SqlHelper.searchQueryInColumns(queryText, Collections.singletonList("bt.label"), params);
        }

        // Optional category filter
        if (badgeCategoryId != null) {
            query += " AND rbcbt.badge_category_id = ?";
            params.add(badgeCategoryId);
        }

        // ORDER BY + LIMIT/OFFSET
        query += " ORDER BY UNACCENT(bt.label) " + SqlHelper.addLimitOffset(limit, offset, params);

        // Execute SQL
        String errorMessage = "Fail to retrieve badge types";
        String completeLog = LoggerHelper.getCompleteLog(this.getClass(), functionName, errorMessage);
        sql.prepared(query, params, SqlResult.validResultHandler(PromiseHelper.handler(promise, completeLog)));

        return promise.future();
    }


    @Override
    public Future<BadgeType> getBadgeType(UserInfos userInfos, long typeId, String host, String language) {
        Promise<BadgeType> promise = Promise.promise();
        BadgeType badgeType = new BadgeType();

        getBadgeTypeRequest(userInfos.getStructures(), typeId)
                .compose(badgeTypeJson -> {
                    badgeType.set(badgeTypeJson);
                    return getOwner(badgeType, host, language);
                })
                .compose(user -> {
                    badgeType.setOwner(user);
                    return badgeCategoryService.getBadgeCategoriesByBadgeTypeId(badgeType.id());
                })
                .compose(badgeCategories -> {
                    badgeType.setCategories(badgeCategories);
                    return getSetting(badgeType);
                })
                .compose(v -> badgeAssignedService.isSelfAssigned(userInfos, badgeType.id()))
                .onSuccess(isSelfAssigned -> {
                    badgeType.setSelfAssigned(isSelfAssigned);
                    promise.complete(badgeType);
                })
                .onFailure(promise::fail);

        return promise.future();
    }

    private Future<JsonObject> getBadgeTypeRequest(List<String> structureIds, long typeId) {
        Promise<JsonObject> promise = Promise.promise();

        JsonArray params = new JsonArray();
        String request = String.format("SELECT id, slug, structure_id, owner_id, picture_id, label, description, " +
                        " description_short, created_at " +
                        " FROM %s WHERE (%s %s structure_id IS NULL) AND id = ?", SqlTable.BADGE_TYPE.getName(),
                SqlHelper.filterStructures(structureIds, params),
                (structureIds != null && !structureIds.isEmpty()) ? "OR" : "");

        params.add(typeId);

        sql.prepared(request, params, SqlResult.validUniqueResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::getBadgeTypeRequest] Fail to retrieve badge types",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

    private Future<User> getOwner(BadgeType badgeType, String host, String language) {

        if (badgeType.ownerId() != null) {
            Promise<User> promise = Promise.promise();
            UserUtils.getUserInfos(Server.getEventBus(Vertx.currentContext().owner()), badgeType.ownerId(), user -> promise.complete((User) user));
            return promise.future();
        }

        String translate = I18n.getInstance().translate("minibadge.admin", host, language);

        return Future.succeededFuture(new User(new JsonObject()
                .put(Field.FIRSTNAME, translate)
                .put(Field.LASTNAME, translate)));
    }
}
