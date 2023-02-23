package fr.openent.minibadge.service;

import fr.openent.minibadge.model.Config;
import fr.openent.minibadge.service.impl.*;
import fr.wseduc.mongodb.MongoDb;
import io.vertx.core.Vertx;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.json.JsonObject;
import org.entcore.common.neo4j.Neo4j;
import org.entcore.common.notification.TimelineHelper;
import org.entcore.common.sql.Sql;
import org.entcore.common.storage.Storage;

public class ServiceFactory {
    private final Vertx vertx;
    private final Storage storage;
    private final Neo4j neo4j;
    private final Sql sql;
    private final MongoDb mongoDb;
    private final JsonObject config;

    public ServiceFactory(Vertx vertx, Storage storage, Neo4j neo4j, Sql sql, MongoDb mongoDb, JsonObject config) {
        this.vertx = vertx;
        this.storage = storage;
        this.neo4j = neo4j;
        this.sql = sql;
        this.mongoDb = mongoDb;
        this.config = config;
    }

    public MinibadgeService minibadgeService() {
        return new DefaultMinibadgeService(sql);
    }

    public SettingService settingService() {
        return new DefaultSettingService();
    }

    public BadgeTypeService badgeTypeService() {
        return new DefaultBadgeTypeService(sql, this.eventBus());
    }

    public BadgeService badgeService() {
        return new DefaultBadgeService(sql, this.userService());
    }

    public BadgeAssignedService badgeAssignedService() {
        return new DefaultBadgeAssignedService(sql, this.badgeService(), this.userService());
    }

    public StructureService structureService() {
        return new DefaultStructureService(neo4j);
    }

    public StatisticService statisticServiceService() {
        return new DefaultStatisticService(sql, new Config(config), userService(), structureService());
    }

    public DefaultNotifyService notifyService() {
        return new DefaultNotifyService(timelineHelper(), badgeTypeService());
    }

    public UserService userService() {
        return new DefaultUserService(sql, neo4j, this.eventBus());
    }

    // Helpers
    public EventBus eventBus() {
        return this.vertx.eventBus();
    }

    public Vertx vertx() {
        return this.vertx;
    }

    public TimelineHelper timelineHelper() {
        return new TimelineHelper(vertx, vertx.eventBus(), vertx.getOrCreateContext().config());
    }

}
