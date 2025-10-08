package fr.openent.minibadge;

import fr.openent.minibadge.controller.*;
import fr.openent.minibadge.model.Config;
import io.vertx.core.Promise;
import io.vertx.core.Vertx;
import io.vertx.core.eventbus.EventBus;
import org.entcore.common.http.BaseServer;
import org.entcore.common.notification.TimelineHelper;
import org.entcore.common.storage.Storage;
import org.entcore.common.storage.StorageFactory;

public class Minibadge extends BaseServer {
    public static final int PAGE_SIZE = 20;
    public static final int PAGE_SIZE_MAX = 100;
    public static final String MINIBADGE = "minibadge";

    public static String dbSchema = MINIBADGE;
    public static Config minibadgeConfig;
    public static Vertx minibadgeVertx;
    public static Storage minibadgeStorage;
    public static EventBus eventBus;
    public static TimelineHelper timelineHelper;

    @Override
    public void start(Promise<Void> startPromise) throws Exception {
        super.start(startPromise);

        dbSchema = config.getString("db-schema", MINIBADGE);
        minibadgeConfig = new Config(config);
        minibadgeVertx = vertx;
        minibadgeStorage = new StorageFactory(vertx, config).getStorage();
        eventBus = getEventBus(vertx);
        timelineHelper = new TimelineHelper(vertx, eventBus, config);

        addController(new MinibadgeController());
        addController(new SettingController());
        addController(new BadgeController());
        addController(new BadgeCategoryController());
        addController(new BadgeTypeController());
        addController(new BadgeAssignedController());
        addController(new StatisticController());
        addController(new UserController());
        addController(new ConfigController());

        startPromise.tryComplete();
    }

}
