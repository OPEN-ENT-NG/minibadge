package fr.openent.minibadge.service;

import fr.openent.minibadge.core.enums.SqlTable;
import fr.openent.minibadge.model.Badge;
import fr.openent.minibadge.service.impl.DefaultBadgeService;
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
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.powermock.reflect.Whitebox;

import java.util.List;

import static org.junit.Assert.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Epic C on "Mes badges reçus" (GET /badges) and on a badge type's receivers.
 * <p>
 * GET /badges is a per-(owner, type) aggregate. Filtering it on badge_assigned_active would make a
 * type whose assignments have ALL expired disappear from the list; instead it stays listed and carries
 * {@code count_active} (0 = expired) next to the unchanged {@code count_assigned}.
 */
@RunWith(VertxUnitRunner.class)
public class DefaultBadgeServiceValidityTest {

    @Mock
    private Sql sql;
    @Mock
    private UserService userService;

    private BadgeService service;

    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        ServiceRegistry.registerService(UserService.class, userService);
        service = DefaultBadgeService.getInstance();
        Whitebox.setInternalState(service, "sql", sql);
        Whitebox.setInternalState(service, "userService", userService);
    }

    private String captureQuery() {
        ArgumentCaptor<String> query = ArgumentCaptor.forClass(String.class);
        verify(sql).prepared(query.capture(), any(), any(Handler.class));
        return query.getValue();
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testReceivedBadgesKeepCountingEveryNonRevokedAssignmentAndAddTheActiveCount() {
        doNothing().when(sql).prepared(any(), any(), any(Handler.class));

        service.getBadges("owner1", null);

        String expected = " WITH assign as (SELECT ba.badge_id, " +
                " COUNT(ba.id) over (partition by ba.badge_id)       as count_assigned, " +
                " MAX(ba.created_at) over (partition by ba.badge_id) as last_assign_created " +
                " FROM " + SqlTable.BADGE_ASSIGNED_VALID.getName() + " ba INNER JOIN " + SqlTable.BADGE.getName() +
                " ob ON ob.id = ba.badge_id AND ob.owner_id = ?), " +
                " assign_active as (SELECT baa.badge_id, COUNT(baa.id) as count_active " +
                " FROM " + SqlTable.BADGE_ASSIGNED_ACTIVE.getName() + " baa INNER JOIN " + SqlTable.BADGE.getName() +
                " ob ON ob.id = baa.badge_id AND ob.owner_id = ? GROUP BY baa.badge_id), " +
                " assign_expiry as (SELECT bae.badge_id, " +
                " CASE WHEN bool_or(bae.expires_at IS NULL) THEN NULL ELSE MAX(bae.expires_at) END as max_expires_at " +
                " FROM " + SqlTable.BADGE_ASSIGNED.getName() + " bae INNER JOIN " + SqlTable.BADGE.getName() +
                " ob ON ob.id = bae.badge_id AND ob.owner_id = ?" +
                " WHERE bae.revoked_at IS NULL GROUP BY bae.badge_id) " +
                " SELECT DISTINCT b.id, b.owner_id, b.badge_type_id, privatized_at, refused_at, disabled_at, " +
                " bt.label as badge_type_label, bt.picture_id as badge_type_picture_id, ba.count_assigned, " +
                " COALESCE(aa.count_active, 0) as count_active, ae.max_expires_at, " +
                " ba.last_assign_created " +
                " FROM " + SqlTable.BADGE.getName() + " b INNER JOIN assign ba on ba.badge_id = b.id " +
                " LEFT JOIN assign_active aa on aa.badge_id = b.id " +
                " LEFT JOIN assign_expiry ae on ae.badge_id = b.id " +
                " INNER JOIN " + SqlTable.BADGE_TYPE.getName() + " bt ON b.badge_type_id = bt.id " +
                " WHERE b.owner_id = ? AND ba.count_assigned > 0   ORDER BY last_assign_created DESC";

        // Every CTE is scoped to the owner's own badges: no full scan of badge_assigned per request.
        verify(sql).prepared(eq(expected), eq(new JsonArray().add("owner1").add("owner1").add("owner1").add("owner1")),
                any(Handler.class));
    }

    @Test
    public void testTheListingConditionIsStillTheNonRevokedCountNotTheActiveOne() {
        doNothing().when(sql).prepared(any(), any(), any(Handler.class));

        service.getBadges("owner1", null);

        String query = captureQuery();
        // The row is kept as long as one non-revoked assignment exists, expired or not...
        assertTrue(query.contains(" AND ba.count_assigned > 0 "));
        // ...and the active view is only LEFT JOINed for the count, so it can never drop a row.
        assertTrue(query.contains(" LEFT JOIN assign_active aa on aa.badge_id = b.id "));
        assertFalse(query.contains("count_active > 0"));
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testAFullyExpiredBadgeTypeIsStillReturnedWithZeroActiveAssignments() {
        FakeSqlReply.answer(sql, query -> FakeSqlReply.rows(new JsonObject()
                .put("id", 100L)
                .put("owner_id", "owner1")
                .put("badge_type_id", 7L)
                .putNull("privatized_at")
                .putNull("refused_at")
                .putNull("disabled_at")
                .put("badge_type_label", "Entraide")
                .put("badge_type_picture_id", "solidaire.svg")
                .put("count_assigned", 2L)
                .put("count_active", 0L)
                .put("max_expires_at", "2026-07-01T00:00:00.000")
                .put("last_assign_created", "2026-01-10T10:00:00.000")));

        Future<List<Badge>> result = service.getBadges("owner1", null);

        assertTrue(result.succeeded());
        assertEquals(1, result.result().size());
        JsonObject badge = result.result().get(0).toJson();
        assertEquals(Integer.valueOf(2), badge.getJsonObject("counts").getInteger("assigned"));
        assertEquals(Integer.valueOf(0), badge.getJsonObject("counts").getInteger("active"));
        assertEquals("2026-07-01T00:00:00.000", badge.getString("maxExpiresAt"));
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testReceiversAndTheirCountIgnoreExpiredAssignments() {
        doNothing().when(sql).prepared(any(), any(), any(Handler.class));

        service.getBadgeTypeReceivers(7L, 10, 0);
        service.countTotalReceivers(7L);

        ArgumentCaptor<String> queries = ArgumentCaptor.forClass(String.class);
        verify(sql, times(2)).prepared(queries.capture(), any(), any(Handler.class));
        for (String query : queries.getAllValues()) {
            assertTrue(query.contains(" INNER JOIN " + SqlTable.BADGE_ASSIGNED_ACTIVE.getName() + " bav on bav.badge_id = bp.id "));
            assertFalse(query.contains(SqlTable.BADGE_ASSIGNED_VALID.getName()));
        }
    }
}
