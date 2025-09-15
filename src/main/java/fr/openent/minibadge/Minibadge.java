package fr.openent.minibadge;

import fr.openent.minibadge.controller.*;
import fr.openent.minibadge.model.Config;
import io.vertx.core.Future;
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
      final Promise<Void> promise = Promise.promise();
      super.start(promise);
      promise.future()
        .compose(e -> this.initMinibadge())
        .onComplete(startPromise);
    }
    public Future<Void> initMinibadge() {
		dbSchema = config.getString("db-schema");
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

	    return Future.succeededFuture();
    }
}
