package fr.openent.minibadge.service;

import fr.openent.minibadge.core.enums.SqlTable;
import fr.openent.minibadge.service.impl.DefaultBadgeAssignedService;
import fr.openent.minibadge.test.FakeSqlReply;
import io.vertx.core.Future;
import io.vertx.core.Handler;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.unit.junit.VertxUnitRunner;
import org.entcore.common.sql.Sql;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.powermock.reflect.Whitebox;

import static org.junit.Assert.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * Epic D, Task 2: the certificate's own query — one row per received assignment (GET /badges is an
 * aggregate per type), expired ones included and flagged, revoked assignments and refused or disabled
 * badges excluded, privatized badges included. Exact SQL and parameters, mocked {@link Sql}.
 */
@RunWith(VertxUnitRunner.class)
public class DefaultBadgeAssignedServiceCertificateTest {

    @Mock
    private Sql sql;
    @Mock
    private BadgeService badgeService;
    @Mock
    private UserService userService;
    @Mock
    private BadgeAssignedStructureService badgeAssignedStructureService;

    private BadgeAssignedService service;

    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        ServiceRegistry.registerService(BadgeService.class, badgeService);
        ServiceRegistry.registerService(UserService.class, userService);
        ServiceRegistry.registerService(BadgeAssignedStructureService.class, badgeAssignedStructureService);
        service = DefaultBadgeAssignedService.getInstance();
        Whitebox.setInternalState(service, "sql", sql);
    }

    private static String expectedQuery() {
        return "SELECT ba.id, ba.created_at, ba.expires_at, " +
                "(ba.expires_at IS NOT NULL AND ba.expires_at <= now()) AS is_expired, " +
                " bt.id AS badge_type_id, bt.label, bt.description, bt.description_short, bt.picture_id, " +
                " assignor.display_name AS assignor_display_name, cat.category_names" +
                " FROM " + SqlTable.BADGE_ASSIGNED.getName() + " ba" +
                " INNER JOIN " + SqlTable.BADGE.getName() + " b ON b.id = ba.badge_id AND b.owner_id = ?" +
                " INNER JOIN " + SqlTable.BADGE_TYPE.getName() + " bt ON bt.id = b.badge_type_id" +
                " LEFT JOIN " + SqlTable.USER.getName() + " assignor ON assignor.id = ba.assignor_id" +
                " LEFT JOIN LATERAL (SELECT string_agg(bc.name, ', ' ORDER BY bc.name) AS category_names" +
                " FROM " + SqlTable.REL_BADGE_CATEGORY_BADGE_TYPE.getName() + " r" +
                " INNER JOIN " + SqlTable.BADGE_CATEGORY.getName() + " bc ON bc.id = r.badge_category_id" +
                " WHERE r.badge_type_id = bt.id) cat ON true" +
                " WHERE ba.revoked_at IS NULL AND b.refused_at IS NULL AND b.disabled_at IS NULL" +
                " ORDER BY ba.created_at DESC, ba.id DESC";
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testTheQueryListsEveryReceivedAssignmentOfTheOwner() {
        JsonObject row = new JsonObject().put("id", 3L).put("label", "Animation").put("is_expired", true);
        FakeSqlReply.answer(sql, query -> FakeSqlReply.rows(row));

        Future<JsonArray> result = service.getReceivedAssignments("owner1");

        verify(sql, times(1)).prepared(eq(expectedQuery()), eq(new JsonArray().add("owner1")), any(Handler.class));
        assertTrue(result.succeeded());
        assertEquals(1, result.result().size());
        assertEquals("Animation", result.result().getJsonObject(0).getString("label"));
        assertTrue(result.result().getJsonObject(0).getBoolean("is_expired"));
    }

    @Test
    public void testTheQueryReadsTheTableNotTheActiveViewAndKeepsPrivatizedBadges() {
        String query = expectedQuery();
        // Expired assignments are kept (badge_assigned_active would drop them), revoked ones are not...
        assertFalse(query.contains(SqlTable.BADGE_ASSIGNED_ACTIVE.getName()));
        assertTrue(query.contains("ba.revoked_at IS NULL"));
        // ...and privatizing a badge only hides it from others: no privatised_at filter.
        assertFalse(query.contains("privatised_at"));
    }

    @Test
    public void testAnEmptyResultIsAnEmptyList() {
        FakeSqlReply.answer(sql, query -> FakeSqlReply.rows());

        Future<JsonArray> result = service.getReceivedAssignments("owner1");

        assertTrue(result.succeeded());
        assertTrue(result.result().isEmpty());
    }

    @Test
    public void testADatabaseFailureFailsTheFuture() {
        FakeSqlReply.answer(sql, query -> FakeSqlReply.error("boom"));

        assertTrue(service.getReceivedAssignments("owner1").failed());
    }
}
