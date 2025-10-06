package fr.openent.minibadge;

import fr.openent.minibadge.controller.*;
import fr.openent.minibadge.model.Config;
import fr.openent.minibadge.repository.impl.RepositoryFactory;
import fr.openent.minibadge.service.impl.ServiceFactory;
import fr.wseduc.mongodb.MongoDb;
import io.vertx.core.Promise;
import io.vertx.core.eventbus.EventBus;
import org.entcore.common.http.BaseServer;
import org.entcore.common.neo4j.Neo4j;
import org.entcore.common.sql.Sql;
import org.entcore.common.storage.Storage;
import org.entcore.common.storage.StorageFactory;

public class Minibadge extends BaseServer {
    public static final int PAGE_SIZE = 20;
    public static final int PAGE_SIZE_MAX = 100;
    public static final String MINIBADGE = "minibadge";

    public static String dbSchema;
    public static Config modelConfig;

    @Override
    public void start(Promise<Void> startPromise) throws Exception {
        super.start(startPromise);

        modelConfig = new Config(config);
        dbSchema = config.getString("db-schema");

        Storage storage = new StorageFactory(vertx, config).getStorage();
        Sql sql = Sql.getInstance();
        Neo4j neo4j = Neo4j.getInstance();
        Config appConfig = new Config(config);
        EventBus eb = getEventBus(vertx);


        RepositoryFactory repositoryFactory = new RepositoryFactory(sql, neo4j);
        ServiceFactory serviceFactory = new ServiceFactory(repositoryFactory, vertx, storage, appConfig, eb);

        addController(new MinibadgeController(serviceFactory));
        addController(new SettingController(serviceFactory));
        addController(new BadgeController(serviceFactory));
        addController(new BadgeCategoryController(serviceFactory));
        addController(new BadgeTypeController(serviceFactory));
        addController(new BadgeAssignedController(serviceFactory));
        addController(new StatisticController(serviceFactory));
        addController(new UserController(serviceFactory));
        addController(new ConfigController());

        startPromise.tryComplete();
    }

}
