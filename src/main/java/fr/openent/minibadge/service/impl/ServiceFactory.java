package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.model.Config;
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

    private static final Logger log = LoggerFactory.getLogger(ServiceFactory.class);
    private final Vertx vertx;
    private final Storage storage;
    private final Neo4j neo4j;
    private final Sql sql;
    private final MongoDb mongoDb;
    private final Config config;

    private final Map<Class<?>, Object> services = new HashMap<>();

    public ServiceFactory(Vertx vertx, Storage storage, Neo4j neo4j, Sql sql, MongoDb mongoDb, JsonObject config) {
        this.vertx = vertx;
        this.storage = storage;
        this.neo4j = neo4j;
        this.sql = sql;
        this.mongoDb = mongoDb;
        this.config = new Config(config);

        /* INSTANCE SERVICES */
        services.put(UserService.class, new DefaultUserService(sql, neo4j, vertx.eventBus()));
        services.put(MinibadgeService.class, new DefaultMinibadgeService(sql));
        services.put(SettingService.class, new DefaultSettingService());
        services.put(BadgeTypeService.class, new DefaultBadgeTypeService(sql, vertx.eventBus()));
        services.put(BadgeService.class, new DefaultBadgeService(sql, getService(UserService.class)));
        services.put(BadgeAssignedStructureService.class, new DefaultBadgeAssignedStructureService(sql,
                getService(UserService.class)));
        services.put(BadgeAssignedService.class, new DefaultBadgeAssignedService(sql,
                getService(BadgeService.class), getService(UserService.class),
                getService(BadgeAssignedStructureService.class)));
        services.put(StructureService.class, new DefaultStructureService(neo4j));
        services.put(StatisticService.class, new DefaultStatisticService(sql, this.config,
                getService(UserService.class), getService(StructureService.class)));
        services.put(TimelineHelper.class, new TimelineHelper(vertx, vertx.eventBus(), config));
        services.put(NotifyService.class, new DefaultNotifyService(getService(TimelineHelper.class),
                getService(BadgeTypeService.class)));
    }

    /**
     *
     *
     * @param clazz class service to get
     * @return an implementation of service
     * @param <T> class service to get
     */
    public <T> T getService(Class<T> clazz) {
        Object factory = services.get(clazz);
        if (factory == null) {
            String errorMessage = String.format("[Minibadge@%s::getService] Service not saved.",
                    this.getClass().getSimpleName());
            log.error(errorMessage);
            throw new IllegalArgumentException(errorMessage);
        }
        return clazz.cast(factory);
    }


    public MinibadgeService minibadgeService() {
        return getService(MinibadgeService.class);
    }

    public SettingService settingService() {
        return getService(SettingService.class);
    }

    public BadgeTypeService badgeTypeService() {
        return getService(BadgeTypeService.class);
    }

    public BadgeService badgeService() {
        return getService(BadgeService.class);
    }

    public BadgeAssignedService badgeAssignedService() {
        return getService(BadgeAssignedService.class);
    }

    public StructureService structureService() {
        return getService(StructureService.class);
    }

    public StatisticService statisticServiceService() {
        return getService(StatisticService.class);
    }

    public BadgeAssignedStructureService badgeAssignedStructureService() {
        return getService(BadgeAssignedStructureService.class);
    }

    public NotifyService notifyService() {
        return getService(NotifyService.class);
    }

    public UserService userService() {
        return getService(UserService.class);
    }

    // Helpers
    public TimelineHelper timelineHelper() {
        return getService(TimelineHelper.class);
    }

    public EventBus eventBus() {
        return this.vertx.eventBus();
    }

    public Vertx vertx() {
        return this.vertx;
    }

}
