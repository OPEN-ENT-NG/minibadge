package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.model.Config;
import fr.openent.minibadge.repository.impl.RepositoryFactory;
import fr.openent.minibadge.service.*;
import fr.wseduc.mongodb.MongoDb;
import io.vertx.core.Vertx;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import org.entcore.common.neo4j.Neo4j;
import org.entcore.common.notification.TimelineHelper;
import org.entcore.common.sql.Sql;
import org.entcore.common.storage.Storage;

import java.util.HashMap;
import java.util.Map;

public class ServiceFactory {

    private final Vertx vertx;
    private final Storage storage;
    private final Config config;
    private final EventBus eventBus;

    private final UserService userService;
    private final SettingService settingService;
    private final BadgeCategoryService badgeCategoryService;
    private final BadgeTypeService badgeTypeService;
    private final BadgeService badgeService;
    private final BadgeAssignedStructureService badgeAssignedStructureService;
    private final BadgeAssignedService badgeAssignedService;
    private final StructureService structureService;
    private final StatisticService statisticService;
    private final TimelineHelper timelineHelper;
    private final NotifyService notifyService;

    public ServiceFactory(RepositoryFactory repositoryFactory, Vertx vertx, Storage storage, Config config, EventBus eventBus) {
        this.vertx = vertx;
        this.storage = storage;
        this.config = config;
        this.eventBus = eventBus;

        // Instantiate services (in correct dependency order)
        this.userService = new DefaultUserService(this, repositoryFactory);
        this.settingService = new DefaultSettingService(repositoryFactory);
        this.badgeCategoryService = new DefaultBadgeCategoryService(repositoryFactory);
        this.badgeTypeService = new DefaultBadgeTypeService(this, repositoryFactory);
        this.badgeService = new DefaultBadgeService(this, repositoryFactory);
        this.badgeAssignedStructureService = new DefaultBadgeAssignedStructureService(this, repositoryFactory);
        this.badgeAssignedService = new DefaultBadgeAssignedService(this, repositoryFactory);
        this.structureService = new DefaultStructureService(repositoryFactory);
        this.statisticService = new DefaultStatisticService(this, repositoryFactory);
        this.timelineHelper = new TimelineHelper(vertx, eventBus, config.toJson());
        this.notifyService = new DefaultNotifyService(this);
    }

    public Vertx vertx() {
        return vertx;
    }

    public EventBus eventBus() {
        return eventBus;
    }

    public Storage storage() {
        return storage;
    }

    public Config config() {
        return config;
    }

    // Getters for services

    public UserService userService() {
        return userService;
    }

    public SettingService settingService() {
        return settingService;
    }

    public BadgeCategoryService badgeCategoryService() {
        return badgeCategoryService;
    }

    public BadgeTypeService badgeTypeService() {
        return badgeTypeService;
    }

    public BadgeService badgeService() {
        return badgeService;
    }

    public BadgeAssignedStructureService badgeAssignedStructureService() {
        return badgeAssignedStructureService;
    }

    public BadgeAssignedService badgeAssignedService() {
        return badgeAssignedService;
    }

    public StructureService structureService() {
        return structureService;
    }

    public StatisticService statisticService() {
        return statisticService;
    }

    public TimelineHelper timelineHelper() {
        return timelineHelper;
    }

    public NotifyService notifyService() {
        return notifyService;
    }

}
