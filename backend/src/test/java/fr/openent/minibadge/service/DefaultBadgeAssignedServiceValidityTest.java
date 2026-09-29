package fr.openent.minibadge.service;

import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.core.enums.SqlTable;
import fr.openent.minibadge.model.BadgeAssigned;
import fr.openent.minibadge.model.User;
import fr.openent.minibadge.service.impl.DefaultBadgeAssignedService;
import fr.openent.minibadge.test.FakeSqlReply;
import io.vertx.core.Future;
import io.vertx.core.Handler;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.unit.junit.VertxUnitRunner;
import org.entcore.common.sql.Sql;
import org.entcore.common.user.UserInfos;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.powermock.reflect.Whitebox;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.Assert.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Epic C, Tasks 2 and 3 on the assignment side: the single INSERT statement that reads the applicable
 * end date, freezes the expiry and refuses an expired type or a still-active assignment (all decided
 * by SQL against the database clock), the mapping of its outcomes, and which view each "current" read
 * path now uses.
 * <p>
 * Same convention as DefaultBadgeTypeServiceCreateTest: exact generated SQL and parameters, with a
 * mocked {@link Sql} (the suite has no database). The real-database behaviour of the view and of the
 * unique index is verified separately against PostgreSQL (see sql/024-badge-validity.sql).
 */
@RunWith(VertxUnitRunner.class)
public class DefaultBadgeAssignedServiceValidityTest {

    private static final long TYPE_ID = 7L;
    private static final List<String> STRUCTURES = Collections.singletonList("structure1");
    private static final List<String> OWNERS = Arrays.asList("owner1", "owner2");

    @Mock
    private Sql sql;
    @Mock
    private BadgeService badgeService;
    @Mock
    private UserService userService;
    @Mock
    private BadgeAssignedStructureService badgeAssignedStructureService;

    private BadgeAssignedService service;
    private UserInfos assignor;

    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        // The singleton resolves its collaborators through ServiceRegistry the first time the class is
        // loaded, which may already have happened in this JVM: register them for that case, then
        // overwrite the fields so this test always drives its own mocks.
        ServiceRegistry.registerService(BadgeService.class, badgeService);
        ServiceRegistry.registerService(UserService.class, userService);
        ServiceRegistry.registerService(BadgeAssignedStructureService.class, badgeAssignedStructureService);
        service = DefaultBadgeAssignedService.getInstance();
        Whitebox.setInternalState(service, "sql", sql);
        Whitebox.setInternalState(service, "badgeService", badgeService);
        Whitebox.setInternalState(service, "userService", userService);
        Whitebox.setInternalState(service, "badgeAssignedStructureService", badgeAssignedStructureService);

        when(badgeService.createBadges(anyLong(), anyList())).thenReturn(Future.succeededFuture());

        assignor = new User(new JsonObject().put(Field.ID, "assignor1"));
        assignor.setStructures(STRUCTURES);
    }

    private static String insertQuery() {
        return "WITH setting AS (SELECT (SELECT bts.valid_until FROM " + SqlTable.BADGE_TYPE_SETTING.getName() + " bts" +
                " WHERE bts.badge_type_id = ? AND (bts.structure_id IN (?) OR bts.structure_id IS NULL)" +
                " ORDER BY bts.structure_id NULLS LAST, bts.id LIMIT 1) AS valid_until), " +
                " candidates AS (SELECT id AS badge_id, owner_id, badge_type_id FROM " + SqlTable.BADGE_ASSIGNABLE.getName() +
                " WHERE badge_type_id = ? AND owner_id IN (?,?)), " +
                " checks AS (SELECT s.valid_until, " +
                " (s.valid_until IS NOT NULL AND s.valid_until < CURRENT_DATE) AS type_expired, " +
                " EXISTS (SELECT 1 FROM " + SqlTable.BADGE_ASSIGNED_ACTIVE.getName() + " baa" +
                " INNER JOIN candidates c ON c.badge_id = baa.badge_id WHERE baa.assignor_id = ?) AS already_assigned" +
                " FROM setting s), " +
                " inserted_badge_assigned AS (INSERT INTO " + SqlTable.BADGE_ASSIGNED.getName() + " (badge_id, assignor_id, expires_at)" +
                " SELECT c.badge_id, ?, (ck.valid_until + 1)::timestamp FROM candidates c CROSS JOIN checks ck" +
                " WHERE NOT ck.type_expired AND NOT ck.already_assigned RETURNING *) " +
                " SELECT ck.type_expired, ck.already_assigned, iba.*, c.badge_type_id, c.owner_id" +
                " FROM checks ck LEFT JOIN inserted_badge_assigned iba ON true" +
                " LEFT JOIN candidates c ON c.badge_id = iba.badge_id";
    }

    private static JsonObject row(boolean typeExpired, boolean alreadyAssigned, Long id, String ownerId) {
        JsonObject row = new JsonObject()
                .put(Field.TYPE_EXPIRED, typeExpired)
                .put(Field.ALREADY_ASSIGNED, alreadyAssigned);
        if (id == null) {
            return row.putNull(Field.ID).putNull(Field.BADGE_ID).putNull(Field.ASSIGNOR_ID).putNull(Field.EXPIRES_AT)
                    .putNull(Field.BADGE_TYPE_ID).putNull(Field.OWNER_ID);
        }
        return row.put(Field.ID, id).put(Field.BADGE_ID, id + 100).put(Field.ASSIGNOR_ID, "assignor1")
                .put(Field.EXPIRES_AT, "2027-07-01T00:00:00.000").put(Field.BADGE_TYPE_ID, TYPE_ID).put(Field.OWNER_ID, ownerId);
    }

    private void givenInsertReplies(JsonObject... rows) {
        FakeSqlReply.answer(sql, query -> FakeSqlReply.rows(rows));
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testAssignIsASingleStatementThatReadsTheSettingAndDecidesInSql() {
        givenInsertReplies(row(false, false, 1L, "owner1"), row(false, false, 2L, "owner2"));

        Future<Void> result = service.assign(TYPE_ID, OWNERS, assignor);

        assertTrue(result.succeeded());
        // Setting precedence (establishment first, then central) is read for the ASSIGNOR's structures,
        // inside the same statement as the insert: no window for a concurrent change of the end date.
        JsonArray expectedParams = new JsonArray()
                .add(TYPE_ID).add("structure1")
                .add(TYPE_ID).add("owner1").add("owner2")
                .add("assignor1")
                .add("assignor1");
        verify(sql, times(1)).prepared(eq(insertQuery()), eq(expectedParams), any(Handler.class));
        ArgumentCaptor<List<BadgeAssigned>> inserted = ArgumentCaptor.forClass(List.class);
        verify(badgeAssignedStructureService).createBadgeAssignedStructures(inserted.capture(), eq(OWNERS), eq(assignor));
        assertEquals(2, inserted.getValue().size());
    }

    @Test
    public void testTheInsertUsesTheDatabaseClockAndTheActiveView() {
        givenInsertReplies(row(false, false, 1L, "owner1"));

        service.assign(TYPE_ID, OWNERS, assignor);

        String query = captureQuery();
        // The end day itself is still valid: only a date strictly before CURRENT_DATE is expired...
        assertTrue(query.contains("(s.valid_until IS NOT NULL AND s.valid_until < CURRENT_DATE) AS type_expired"));
        // ...and the frozen expiry is the next midnight (NULL + 1 stays NULL: permanent).
        assertTrue(query.contains("(ck.valid_until + 1)::timestamp"));
        assertTrue("An expired assignment must not block re-awarding: only the active view is checked",
                query.contains(SqlTable.BADGE_ASSIGNED_ACTIVE.getName()));
        assertFalse(query.contains(SqlTable.BADGE_ASSIGNED_VALID.getName()));
    }

    @Test
    public void testAssignOfAnExpiredBadgeTypeIsRefused() {
        givenInsertReplies(row(true, false, null, null));

        Future<Void> result = service.assign(TYPE_ID, OWNERS, assignor);

        assertTrue(result.failed());
        assertEquals(BadgeAssignedService.BADGE_TYPE_EXPIRED_ERROR, result.cause().getMessage());
        verify(badgeAssignedStructureService, never()).createBadgeAssignedStructures(any(), any(), any());
    }

    @Test
    public void testAssignIsRefusedWhileTheSameAssignorStillHoldsAnActiveAssignment() {
        givenInsertReplies(row(false, true, null, null));

        Future<Void> result = service.assign(TYPE_ID, OWNERS, assignor);

        assertTrue(result.failed());
        assertEquals(BadgeAssignedService.ALREADY_ASSIGNED_ERROR, result.cause().getMessage());
        verify(badgeAssignedStructureService, never()).createBadgeAssignedStructures(any(), any(), any());
    }

    @Test
    public void testAConcurrentDuplicateCaughtByTheUniqueIndexIsAlreadyAssignedNotARawDatabaseError() {
        FakeSqlReply.answer(sql, query -> FakeSqlReply.error("ERROR: duplicate key value violates unique constraint " +
                "\"one_assignment_per_assignor\" Detail: Key (badge_id, assignor_id, ...)=(101, assignor1, infinity) already exists."));

        Future<Void> result = service.assign(TYPE_ID, OWNERS, assignor);

        assertTrue(result.failed());
        assertEquals(BadgeAssignedService.ALREADY_ASSIGNED_ERROR, result.cause().getMessage());
    }

    @Test
    public void testAnyOtherDatabaseErrorNeverLeaksTheRawMessage() {
        FakeSqlReply.answer(sql, query -> FakeSqlReply.error("ERROR: relation \"minibadge.secret\" does not exist"));

        Future<Void> result = service.assign(TYPE_ID, OWNERS, assignor);

        assertTrue(result.failed());
        assertFalse(result.cause().getMessage().contains("minibadge.secret"));
        assertNotEquals(BadgeAssignedService.ALREADY_ASSIGNED_ERROR, result.cause().getMessage());
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testNothingInsertableIsASuccessWithNoAssignment() {
        // e.g. every target badge was refused by its owner: only the checks row comes back.
        givenInsertReplies(row(false, false, null, null));

        assertTrue(service.assign(TYPE_ID, OWNERS, assignor).succeeded());

        ArgumentCaptor<List<BadgeAssigned>> inserted = ArgumentCaptor.forClass(List.class);
        verify(badgeAssignedStructureService).createBadgeAssignedStructures(inserted.capture(), eq(OWNERS), eq(assignor));
        assertTrue(inserted.getValue().isEmpty());
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testAnEmptyOwnerListWritesNothing() {
        assertTrue(service.assign(TYPE_ID, Collections.emptyList(), assignor).succeeded());

        verify(badgeService, never()).createBadges(anyLong(), anyList());
        verify(sql, never()).prepared(any(), any(), any(Handler.class));
    }

    private String captureQuery() {
        ArgumentCaptor<String> query = ArgumentCaptor.forClass(String.class);
        verify(sql).prepared(query.capture(), any(), any(Handler.class));
        return query.getValue();
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testSelfAssignCheckIgnoresExpiredAssignments() {
        doNothing().when(sql).prepared(any(), any(), any(Handler.class));

        service.isSelfAssigned(assignor, TYPE_ID);

        String expected = "SELECT COUNT(*) " +
                "FROM " + SqlTable.BADGE.getName() + " b " +
                "JOIN " + SqlTable.BADGE_ASSIGNED_ACTIVE.getName() + " ba ON ba.badge_id = b.id " +
                "WHERE b.badge_type_id = ? " +
                "AND b.owner_id = ? " +
                "AND ba.assignor_id = ?";
        verify(sql).prepared(eq(expected), eq(new JsonArray().add(TYPE_ID).add("assignor1").add("assignor1")),
                any(Handler.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testAssignersAndTheirCountIgnoreExpiredAssignments() {
        doNothing().when(sql).prepared(any(), any(), any(Handler.class));

        service.getBadgeTypeAssigners(TYPE_ID, assignor, 10, 0);
        service.countTotalAssigners(TYPE_ID, assignor);

        String expectedList = " SELECT DISTINCT(assignor_id) as id, bav.created_at " +
                " FROM " + SqlTable.BADGE_ASSIGNED_ACTIVE.getName() + " bav INNER JOIN " + SqlTable.BADGE_PUBLIC.getName() +
                " bp on bp.id = bav.badge_id " +
                " WHERE owner_id = ? AND badge_type_id = ? " +
                " ORDER BY bav.created_at DESC  LIMIT ?  OFFSET ? ";
        String expectedCount = " SELECT COUNT(DISTINCT(assignor_id)) " +
                " FROM " + SqlTable.BADGE_ASSIGNED_ACTIVE.getName() + " bav INNER JOIN " + SqlTable.BADGE_PUBLIC.getName() +
                " bp on bp.id = bav.badge_id " +
                " WHERE owner_id = ? AND badge_type_id = ?";
        verify(sql).prepared(eq(expectedList), eq(new JsonArray().add("assignor1").add(TYPE_ID).add(10).add(0)),
                any(Handler.class));
        verify(sql).prepared(eq(expectedCount), eq(new JsonArray().add("assignor1").add(TYPE_ID)), any(Handler.class));
    }

    @Test
    public void testBadgesGivenExposeTheFrozenExpiryAndAServerComputedExpiredFlag() {
        doNothing().when(sql).prepared(any(), any(), any(Handler.class));

        service.getBadgesGiven(null, null, null, null, null, null, "assignor1");

        String query = captureQuery();
        // Still the raw table (revoked rows included, as before) — expiry is shown, never filtered.
        assertTrue(query.contains(" FROM " + SqlTable.BADGE_ASSIGNED.getName() + " as ba "));
        assertTrue(query.contains(" ba.expires_at, (ba.expires_at IS NOT NULL AND ba.expires_at <= now()) AS is_expired, "));
        assertFalse(query.contains(SqlTable.BADGE_ASSIGNED_ACTIVE.getName()));
    }

    @Test
    public void testAdminHistoryKeepsExpiredAssignmentsAndExposesTheirExpiry() {
        doNothing().when(sql).prepared(any(), any(), any(Handler.class));

        service.getAllAssignedBadges(null, null, null, null, null, STRUCTURES);

        String query = captureQuery();
        assertTrue("The admin history must keep reading the non-revoked view, expired rows included",
                query.contains(" FROM " + SqlTable.BADGE_ASSIGNED_VALID.getName() + " as bav "));
        assertTrue(query.contains(" INNER JOIN " + SqlTable.BADGE_ASSIGNED.getName() + " as ba  ON ba.id = bav.id "));
        assertTrue(query.contains(" ba.expires_at, (ba.expires_at IS NOT NULL AND ba.expires_at <= now()) AS is_expired, "));
        assertFalse(query.contains(SqlTable.BADGE_ASSIGNED_ACTIVE.getName()));
    }
}
