package fr.openent.minibadge.service;

import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.model.BadgeAssigned;
import fr.openent.minibadge.model.User;
import fr.openent.minibadge.service.impl.*;
import fr.wseduc.mongodb.MongoDb;
import io.vertx.core.Future;
import io.vertx.core.Handler;
import io.vertx.core.Vertx;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.unit.junit.VertxUnitRunner;
import org.entcore.common.neo4j.Neo4j;
import org.entcore.common.sql.Sql;
import org.entcore.common.storage.Storage;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.powermock.api.mockito.PowerMockito;
import org.powermock.core.classloader.annotations.PrepareForTest;
import org.powermock.modules.junit4.PowerMockRunner;
import org.powermock.modules.junit4.PowerMockRunnerDelegate;

import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@RunWith(PowerMockRunner.class)
@PowerMockRunnerDelegate(VertxUnitRunner.class)
@PrepareForTest({ServiceFactory.class, DefaultUserService.class})
public class DefaultBadgeAssignedStructureServiceTest {
    private static final List<BadgeAssigned> badgeAssignedList = Arrays.asList(
            new BadgeAssigned().set(new JsonObject().put(Field.ID, 1L).put(Field.ASSIGNOR_ID, "user1")
                    .put(Field.OWNER_ID, "user2").put(Field.BADGE_ID, 1)),
            new BadgeAssigned().set(new JsonObject().put(Field.ID, 2L).put(Field.ASSIGNOR_ID, "user1")
                    .put(Field.OWNER_ID, "user3").put(Field.BADGE_ID, 2))
    );

    private static final List<User> users = Arrays.asList(
            new User().set(new JsonObject().put(Field.ID, "user1").put(Field.STRUCTUREIDS, new JsonArray().add("structure1"))),
            new User().set(new JsonObject().put(Field.ID, "user2").put(Field.STRUCTUREIDS, new JsonArray().add("structure1").add("structure2"))),
            new User().set(new JsonObject().put(Field.ID, "user3").put(Field.STRUCTUREIDS, new JsonArray().add("structure2")))
    );

    @Mock
    private Storage storage;

    @Mock
    private Neo4j neo4j;

    @Mock
    private Sql sql;

    @Mock
    private MongoDb mongoDb;

    @Mock
    private DefaultUserService userService;
    private BadgeAssignedStructureService badgeAssignedStructureService;

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        PowerMockito.spy(DefaultUserService.class);
        PowerMockito.spy(ServiceFactory.class);
        PowerMockito.whenNew(DefaultUserService.class).withAnyArguments().thenReturn(userService);
        ServiceFactory serviceFactory = new ServiceFactory(Vertx.vertx(), storage, neo4j, sql, mongoDb, new JsonObject());
        badgeAssignedStructureService = serviceFactory.badgeAssignedStructureService();
    }

    @Test
    public void testCreateBadgeAssignedStructuresWithAssignor() {
        User assignor = users.get(0);
        String queryExpected = "INSERT INTO " + DefaultBadgeAssignedStructureService.BADGE_ASSIGNED_STRUCTURE_TABLE +
                " (badge_assigned_id, structure_id, is_structure_assigner, " +
                " is_structure_receiver) VALUES (?,?,?,?), (?,?,?,?), (?,?,?,?)";
        JsonArray expectedParams = new JsonArray()
                .add(badgeAssignedList.get(0).id()).add("structure1").add(true).add(true)
                .add(badgeAssignedList.get(1).id()).add("structure2").add(false).add(true)
                .add(badgeAssignedList.get(1).id()).add("structure1").add(true).add(false);

        doReturn(Future.succeededFuture(users)).when(userService).getUsers(any());
        doNothing().when(sql).prepared(any(), any(), any(Handler.class));

        badgeAssignedStructureService
                .createBadgeAssignedStructures(badgeAssignedList, Arrays.asList("user2", "user3"), assignor);

        verify(sql).prepared(eq(queryExpected), eq(expectedParams), any(Handler.class));
    }

    @Test
    public void testCreateBadgeAssignedStructuresWithoutAssignor() {
        String queryExpected = "INSERT INTO " + DefaultBadgeAssignedStructureService.BADGE_ASSIGNED_STRUCTURE_TABLE +
                " (badge_assigned_id, structure_id, is_structure_assigner, " +
                " is_structure_receiver) VALUES (?,?,?,?), (?,?,?,?), (?,?,?,?)";
        JsonArray expectedParams = new JsonArray()
                .add(badgeAssignedList.get(0).id()).add("structure1").add(true).add(true)
                .add(badgeAssignedList.get(1).id()).add("structure2").add(false).add(true)
                .add(badgeAssignedList.get(1).id()).add("structure1").add(true).add(false);

        doReturn(Future.succeededFuture(users)).when(userService).getUsers(any());
        doNothing().when(sql).prepared(any(), any(), any(Handler.class));

        badgeAssignedStructureService
                .createBadgeAssignedStructures(badgeAssignedList, Arrays.asList("user1", "user2", "user3"));

        verify(sql).prepared(eq(queryExpected), eq(expectedParams), any(Handler.class));
    }

    @Test
    public void testGetAssignationsWithoutStructuresLinked() {

        String queryExpected = "SELECT b.id as badge_id, owner_id, ba.id as id, assignor_id" +
                " FROM  " + DefaultBadgeService.BADGE_TABLE + " b " +
                " INNER JOIN " + DefaultBadgeAssignedService.BADGE_ASSIGNED_TABLE + " ba ON b.id = ba.badge_id " +
                " LEFT JOIN " + DefaultBadgeAssignedStructureService.BADGE_ASSIGNED_STRUCTURE_TABLE + " bas on ba.id = bas.badge_assigned_id " +
                " WHERE bas.badge_assigned_id IS NULL";

        doNothing().when(sql).prepared(any(), any(), any(Handler.class));
        badgeAssignedStructureService.getAssignationsWithoutStructuresLinked();
        verify(sql).prepared(eq(queryExpected), eq(new JsonArray()), any(Handler.class));
    }
}
