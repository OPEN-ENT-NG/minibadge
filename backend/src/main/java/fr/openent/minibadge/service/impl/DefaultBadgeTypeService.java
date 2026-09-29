package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.core.constants.UserType;
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

    /**
     * Assignation relations given to every locally created badge type, mirroring exactly what
     * sql/022-seed-teacher-protagonist-setting.sql seeded for the centralized ones: Student and
     * Teacher may assign, Student may receive. Compile-time constants, never user input, hence
     * inlined as SQL literals in {@link #createBadgeTypeRequest}.
     */
    private static final String DEFAULT_PROTAGONIST_VALUES = String.format("('%s', '%s'), ('%s', '%s'), ('%s', '%s')",
            UserType.STUDENT, Field.SENDER_PROFILE,
            UserType.TEACHER, Field.SENDER_PROFILE,
            UserType.STUDENT, Field.TARGET_PROFILE);

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
                        categoryFutures.add(getSetting(badgeType, structureIds));
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
    private Future<Void> getSetting(BadgeType badgeType, List<String> structureIds) {
        // A genuine failure here (as opposed to the "no rows seeded" case, already handled inside
        // getRelationsSetting) is logged before falling back so a systemic DB issue stays visible.
        Future<TypeSetting> relationsFuture = badgeProtagonistSettingService.getRelationsSetting(badgeType.id(), structureIds)
                .otherwise(err -> {
                    LoggerHelper.logError(this, "getSetting",
                            "Fail to retrieve badge protagonist relations settings for badgeTypeId: " + badgeType.id(),
                            err.getMessage());
                    return SettingHelper.getDefaultTypeSetting();
                });
        Future<Boolean> selfAssignableFuture = badgeTypeSettingService.isBadgeTypeSelfAssignable(badgeType.id(), structureIds);

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
                    return getSetting(badgeType, userInfos.getStructures());
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

    @Override
    public Future<BadgeType> create(BadgeType badgeType, List<Long> categoryIds) {
        Promise<BadgeType> promise = Promise.promise();

        createBadgeTypeRequest(badgeType, categoryIds != null ? categoryIds : Collections.emptyList())
                .onSuccess(createdBadgeType -> promise.complete(new BadgeType(createdBadgeType)))
                .onFailure(err -> {
                    // `slug` is the only UNIQUE constraint a creation can realistically violate: the
                    // badge_type_setting / badge_protagonist_setting / rel_badge_category_badge_type
                    // rows all hang off a brand-new badge_type_id and cannot collide with anything.
                    if (isUniqueViolation(err.getMessage())) {
                        LoggerHelper.logError(this, "create",
                                "Slug conflict while creating badge type " + badgeType.label(), err.getMessage());
                        promise.fail(DUPLICATE_SLUG_ERROR);
                        return;
                    }
                    LoggerHelper.logError(this, "create",
                            "Fail to create badge type " + badgeType.label(), err.getMessage());
                    promise.fail(err);
                });

        return promise.future();
    }

    private static boolean isUniqueViolation(String errorMessage) {
        if (errorMessage == null) return false;
        String message = errorMessage.toLowerCase();
        return message.contains("duplicate key") || message.contains("unique constraint");
    }

    /**
     * Single chained-CTE statement inserting the badge type and all of its companion rows, returning
     * the created badge type. Data-modifying CTEs run exactly once and to completion whether or not the
     * primary query reads their output, so `ins_setting`, `ins_protagonist` and `ins_category` all run
     * even though only `ins_type` is selected from.
     * <p>
     * The protagonist profiles are inlined as SQL literals rather than bound parameters: they are
     * compile-time constants of this codebase (never user input), and inlining them keeps the VALUES
     * list's column types unambiguous. Same for `is_self_assignable`, which is always false on creation.
     */
    private Future<JsonObject> createBadgeTypeRequest(BadgeType badgeType, List<Long> categoryIds) {
        Promise<JsonObject> promise = Promise.promise();

        JsonArray params = new JsonArray()
                .add(badgeType.structureId())
                .add(badgeType.ownerId())
                .add(badgeType.pictureId())
                .add(badgeType.label())
                .add(badgeType.description())
                .add(badgeType.descriptionShort())
                .add(badgeType.structureId());

        StringBuilder request = new StringBuilder()
                .append("WITH ins_type AS (")
                .append(" INSERT INTO ").append(SqlTable.BADGE_TYPE.getName())
                .append(" (structure_id, owner_id, picture_id, label, description, description_short)")
                .append(" VALUES (?, ?, ?, ?, ?, ?)")
                .append(" RETURNING id, slug, structure_id, owner_id, picture_id, label, description,")
                .append(" description_short, created_at")
                .append("), ins_setting AS (")
                .append(" INSERT INTO ").append(SqlTable.BADGE_TYPE_SETTING.getName())
                .append(" (structure_id, badge_type_id, is_self_assignable)")
                .append(" SELECT ?, id, false FROM ins_type")
                .append(" RETURNING id")
                .append("), ins_protagonist AS (")
                .append(" INSERT INTO ").append(SqlTable.BADGE_PROTAGONIST_SETTING.getName())
                .append(" (badge_type_setting_id, protagonist_type_id, protagonist_type)")
                .append(" SELECT ins_setting.id, protagonist.protagonist_type_id, protagonist.protagonist_type")
                .append(" FROM ins_setting CROSS JOIN (VALUES ").append(DEFAULT_PROTAGONIST_VALUES)
                .append(") AS protagonist (protagonist_type_id, protagonist_type)")
                .append(" RETURNING id")
                .append(")");

        if (!categoryIds.isEmpty()) {
            // Selecting from badge_category (rather than inserting the submitted ids blind) means an
            // id with no matching category is skipped instead of aborting the whole creation with a
            // foreign key violation, and de-duplicates a list containing the same id twice.
            request.append(", ins_category AS (")
                    .append(" INSERT INTO ").append(SqlTable.REL_BADGE_CATEGORY_BADGE_TYPE.getName())
                    .append(" (badge_category_id, badge_type_id)")
                    .append(" SELECT bc.id, ins_type.id FROM ").append(SqlTable.BADGE_CATEGORY.getName()).append(" bc")
                    .append(" CROSS JOIN ins_type WHERE bc.id IN ").append(Sql.listPrepared(categoryIds))
                    .append(" RETURNING badge_category_id")
                    .append(")");
            params.addAll(new JsonArray(categoryIds));
        }

        request.append(" SELECT * FROM ins_type");

        // Deliberately no error message passed to the handler: PromiseHelper swallows the raw SQL
        // error whenever one is given, and `create` above needs it to tell a slug collision apart
        // from any other failure.
        sql.prepared(request.toString(), params, SqlResult.validUniqueResultHandler(PromiseHelper.handler(promise)));

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
