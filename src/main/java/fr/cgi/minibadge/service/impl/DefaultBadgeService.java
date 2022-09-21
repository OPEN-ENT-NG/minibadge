package fr.cgi.minibadge.service.impl;

import fr.cgi.minibadge.Minibadge;
import fr.cgi.minibadge.core.constants.Database;
import fr.cgi.minibadge.helper.PromiseHelper;
import fr.cgi.minibadge.service.BadgeService;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public class DefaultBadgeService implements BadgeService {

    private final Sql sql;
    private static final String BADGE_TABLE = String.format("%s.%s", Minibadge.dbSchema, Database.BADGE);
    public static final String BADGE_ASSIGNABLE_TABLE = String.format("%s.%s", Minibadge.dbSchema, Database.BADGE_ASSIGNABLE);

    public DefaultBadgeService(Sql sql) {
        this.sql = sql;
    }

    @Override
    public Future<Void> createBadges(long typeId, List<String> ownerIds) {
        Promise<Void> promise = Promise.promise();

        createBadgesRequest(typeId, ownerIds)
                .onSuccess(badgeTypes -> promise.complete())
                .onFailure(promise::fail);

        return promise.future();
    }

    private Future<JsonArray> createBadgesRequest(long typeId, List<String> ownerIds) {
        Promise<JsonArray> promise = Promise.promise();

        JsonArray params = new JsonArray();
        String request = String.format("INSERT INTO %s (owner_id, badge_type_id) " +
                        " VALUES %s " +
                        " ON CONFLICT DO NOTHING;", BADGE_TABLE,
                ownerIds.stream()
                        .map(ownerId -> {
                            params.add(ownerId)
                                    .add(typeId);
                            return Sql.listPrepared(Arrays.asList(ownerId, typeId));
                        })
                        .collect(Collectors.joining(", "))
        );

        sql.prepared(request, params, SqlResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::createBadgesRequest] Fail to create badges",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }
}
