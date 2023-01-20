package fr.cgi.minibadge.service.impl;

import fr.cgi.minibadge.Minibadge;
import fr.cgi.minibadge.core.constants.Database;
import fr.cgi.minibadge.core.constants.Field;
import fr.cgi.minibadge.helper.PromiseHelper;
import fr.cgi.minibadge.helper.SettingHelper;
import fr.cgi.minibadge.helper.SqlHelper;
import fr.cgi.minibadge.model.BadgeType;
import fr.cgi.minibadge.model.User;
import fr.cgi.minibadge.service.BadgeTypeService;
import fr.wseduc.webutils.I18n;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;
import org.entcore.common.user.UserUtils;

import java.util.Collections;
import java.util.List;

public class DefaultBadgeTypeService implements BadgeTypeService {

    public static final String BADGE_TYPE_TABLE = String.format("%s.%s", Minibadge.dbSchema, Database.BADGE_TYPE);
    private final Sql sql;
    private final EventBus eb;

    public DefaultBadgeTypeService(Sql sql, EventBus eb) {
        this.sql = sql;
        this.eb = eb;
    }

    @Override
    public Future<List<BadgeType>> getBadgeTypes(List<String> structureIds, String query, int limit, Integer offset) {
        Promise<List<BadgeType>> promise = Promise.promise();

        getBadgesTypesRequest(structureIds, query, limit, offset)
                .onSuccess(badgeTypesArray -> {
                    List<BadgeType> badgeTypes = new BadgeType().toList(badgeTypesArray);
                    badgeTypes.forEach(badgeType -> badgeType.setSetting(SettingHelper.getDefaultTypeSetting()));
                    promise.complete(badgeTypes);
                })
                .onFailure(promise::fail);

        return promise.future();
    }

    private Future<JsonArray> getBadgesTypesRequest(List<String> structureIds, String query, int limit, Integer offset) {
        Promise<JsonArray> promise = Promise.promise();

        JsonArray params = new JsonArray();

        String request = String.format("SELECT id, slug, structure_id, owner_id, picture_id, label, description, " +
                        " description_short FROM %s WHERE (%s %s structure_id IS NULL) %s %s ORDER BY label %s",
                BADGE_TYPE_TABLE,
                SqlHelper.filterStructures(structureIds, params),
                (structureIds != null && !structureIds.isEmpty()) ? "OR" : "",
                (query != null && !query.isEmpty()) ? "AND" : "",
                SqlHelper.searchQueryInColumns(query, Collections.singletonList(Database.LABEL), params),
                SqlHelper.addLimitOffset(limit, offset, params));


        sql.prepared(request, params, SqlResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::getBadgesTypesRequest] Fail to retrieve badge types",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

    @Override
    public Future<BadgeType> getBadgeType(List<String> structureIds, long typeId, String host, String language) {
        Promise<BadgeType> promise = Promise.promise();
        BadgeType badgeType = new BadgeType();

        getBadgeTypeRequest(structureIds, typeId)
                .compose(badgeTypeJson -> {
                    badgeType.set(badgeTypeJson);
                    return getOwner(badgeType, host, language);
                })
                .onSuccess(user -> {
                    badgeType.setOwner(user);
                    badgeType.setSetting(SettingHelper.getDefaultTypeSetting());
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
                        " FROM %s WHERE (%s %s structure_id IS NULL) AND id = ?", BADGE_TYPE_TABLE,
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
            UserUtils.getUserInfos(eb, badgeType.ownerId(), user -> promise.complete((User) user));
            return promise.future();
        }

        String translate = I18n.getInstance().translate("minibadge.admin", host, language);

        return Future.succeededFuture(new User(new JsonObject()
                .put(Field.FIRSTNAME, translate)
                .put(Field.LASTNAME, translate)));
    }
}
