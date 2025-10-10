package fr.openent.minibadge;

import fr.openent.minibadge.controller.*;
import fr.openent.minibadge.model.Config;
import fr.openent.minibadge.service.ServiceRegistry;
import io.vertx.core.Promise;
import org.entcore.common.http.BaseServer;

public class Minibadge extends BaseServer {
    public static final int PAGE_SIZE = 20;
    public static final int PAGE_SIZE_MAX = 100;
    public static final String MINIBADGE = "minibadge";

    public static String dbSchema = MINIBADGE;
    public static Config minibadgeConfig;

    @Override
    public void start(Promise<Void> startPromise) throws Exception {
        ServiceRegistry.initServices();

        super.start(startPromise);

        dbSchema = config.getString("db-schema", MINIBADGE);
        minibadgeConfig = new Config(config);

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
