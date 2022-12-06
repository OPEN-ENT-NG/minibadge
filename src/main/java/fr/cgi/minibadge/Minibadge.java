package fr.cgi.minibadge;

import fr.cgi.minibadge.controller.*;
import fr.cgi.minibadge.service.ServiceFactory;
import fr.wseduc.mongodb.MongoDb;
import org.entcore.common.http.BaseServer;
import org.entcore.common.neo4j.Neo4j;
import org.entcore.common.sql.Sql;
import org.entcore.common.storage.Storage;
import org.entcore.common.storage.StorageFactory;

public class Minibadge extends BaseServer {
    public static final int PAGE_SIZE = 20;
    public static final int PAGE_SIZE_MAX = 100;

    public static String dbSchema;

    @Override
    public void start() throws Exception {
        super.start();

        dbSchema = config.getString("db-schema");

        Storage storage = new StorageFactory(vertx, config).getStorage();

        ServiceFactory serviceFactory = new ServiceFactory(vertx, storage, Neo4j.getInstance(), Sql.getInstance(), MongoDb.getInstance(), config);

        addController(new MinibadgeController(serviceFactory));
        addController(new SettingController(serviceFactory));
        addController(new BadgeController(serviceFactory));
        addController(new BadgeTypeController(serviceFactory));
        addController(new BadgeAssignedController(serviceFactory));
        addController(new StatisticController(serviceFactory));
        addController(new UserController(serviceFactory));
    }

}
