package fr.openent.minibadge.service;

import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.core.enums.SqlTable;
import fr.openent.minibadge.helper.SettingHelper;
import fr.openent.minibadge.model.BadgeType;
import fr.openent.minibadge.model.BadgeTypeSetting;
import fr.openent.minibadge.service.impl.DefaultBadgeTypeService;
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

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.Assert.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Epic C, Task 5: PUT /types/:typeId/validity, the ONE edit a local admin may make to a badge type.
 * <p>
 * The security boundary lives in a single UPDATE statement whose WHERE clause is the ownership check:
 * the badge type must belong to one of the caller's own structures (never a central badge), and only
 * that establishment's setting row is written. Zero rows updated is how "central badge" and "another
 * establishment's badge" surface, so both are driven here through the reply the database would give.
 * That the statement really refuses them was verified against PostgreSQL (sql/024 header).
 */
@RunWith(VertxUnitRunner.class)
public class DefaultBadgeTypeServiceValidityTest {

    private static final long TYPE_ID = 51L;
    private static final List<String> MY_STRUCTURES = Arrays.asList("structure1", "structure2");

    @Mock
    private Sql sql;
    @Mock
    private BadgeTypeSettingService badgeTypeSettingService;
    @Mock
    private BadgeProtagonistSettingService badgeProtagonistSettingService;

    private BadgeTypeService service;

    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        ServiceRegistry.registerService(BadgeCategoryService.class, mock(BadgeCategoryService.class));
        ServiceRegistry.registerService(BadgeTypeSettingService.class, badgeTypeSettingService);
        ServiceRegistry.registerService(BadgeProtagonistSettingService.class, badgeProtagonistSettingService);
        ServiceRegistry.registerService(BadgeAssignedService.class, mock(BadgeAssignedService.class));
        service = DefaultBadgeTypeService.getInstance();
        Whitebox.setInternalState(service, "sql", sql);
        Whitebox.setInternalState(service, "badgeTypeSettingService", badgeTypeSettingService);
        Whitebox.setInternalState(service, "badgeProtagonistSettingService", badgeProtagonistSettingService);
    }

    private static String expectedUpdate() {
        return "UPDATE " + SqlTable.BADGE_TYPE_SETTING.getName() + " bts" +
                " SET valid_until = ?::date" +
                " FROM " + SqlTable.BADGE_TYPE.getName() + " bt" +
                " WHERE bts.badge_type_id = bt.id" +
                " AND bts.structure_id = bt.structure_id" +
                " AND bt.id = ?" +
                " AND bt.structure_id IS NOT NULL" +
                " AND bt.structure_id IN (?,?)" +
                " RETURNING bts.id";
    }

    private static final String PAST_CHECK = "SELECT (?::date < CURRENT_DATE) AS is_past";

    /** The past-date check answers {@code isPast}; the UPDATE answers {@code updateRows}. */
    private void givenReplies(boolean isPast, JsonObject... updateRows) {
        FakeSqlReply.answer(sql, query -> query.equals(PAST_CHECK)
                ? FakeSqlReply.rows(new JsonObject().put("is_past", isPast))
                : FakeSqlReply.rows(updateRows));
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testUpdateIsScopedToTheCallersOwnStructuresAndNeverToACentralBadge() {
        String validUntil = "2027-06-30";
        givenReplies(false, new JsonObject().put("id", 9L));

        Future<Void> result = service.updateValidity(TYPE_ID, MY_STRUCTURES, validUntil);

        assertTrue(result.succeeded());
        verify(sql, times(1)).prepared(eq(expectedUpdate()),
                eq(new JsonArray().add(validUntil).add(TYPE_ID).add("structure1").add("structure2")),
                any(Handler.class));
    }

    @Test
    public void testUpdateNeverRewritesAlreadyFrozenExpiries() {
        givenReplies(false, new JsonObject().put("id", 9L));

        service.updateValidity(TYPE_ID, MY_STRUCTURES, "2027-06-30");

        ArgumentCaptor<String> query = ArgumentCaptor.forClass(String.class);
        verify(sql, times(2)).prepared(query.capture(), any(), any(Handler.class));
        assertEquals(PAST_CHECK, query.getAllValues().get(0));
        String update = query.getAllValues().get(1);
        assertTrue(update.startsWith("UPDATE " + SqlTable.BADGE_TYPE_SETTING.getName() + " "));
        assertFalse("Assignments keep the expiry frozen into them: badge_assigned is never written",
                update.contains(SqlTable.BADGE_ASSIGNED.getName()));
        assertFalse(update.contains("expires_at"));
    }

    @Test
    public void testACentralBadgeOrAnotherEstablishmentsBadgeIsRefused() {
        // What the UPDATE returns for a central badge (bt.structure_id IS NULL), for a badge of a
        // structure outside MY_STRUCTURES, or for an unknown id: no row.
        givenReplies(false);

        Future<Void> result = service.updateValidity(TYPE_ID, MY_STRUCTURES, "2027-06-30");

        assertTrue(result.failed());
        assertEquals(BadgeTypeService.VALIDITY_FORBIDDEN_ERROR, result.cause().getMessage());
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testAUserWithoutAnyStructureIsRefusedWithoutIssuingAnySql() {
        Future<Void> result = service.updateValidity(TYPE_ID, Collections.emptyList(), "2027-06-30");

        assertTrue(result.failed());
        assertEquals(BadgeTypeService.VALIDITY_FORBIDDEN_ERROR, result.cause().getMessage());
        verify(sql, never()).prepared(any(), any(), any(Handler.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testAPastEndDateIsRefusedByTheDatabaseClockBeforeAnyWrite() {
        // Whether the date is past is the DATABASE's call (CURRENT_DATE), never the JVM clock's.
        givenReplies(true, new JsonObject().put("id", 9L));

        Future<Void> result = service.updateValidity(TYPE_ID, MY_STRUCTURES, "2026-09-28");

        assertTrue(result.failed());
        assertEquals(BadgeTypeService.VALIDITY_PAST_ERROR, result.cause().getMessage());
        verify(sql).prepared(eq(PAST_CHECK), eq(new JsonArray().add("2026-09-28")), any(Handler.class));
        verify(sql, never()).prepared(eq(expectedUpdate()), any(), any(Handler.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testAMalformedEndDateIsRefusedWithoutIssuingAnySql() {
        Future<Void> result = service.updateValidity(TYPE_ID, MY_STRUCTURES, "not-a-date");

        assertTrue(result.failed());
        assertEquals(BadgeTypeService.VALIDITY_INVALID_ERROR, result.cause().getMessage());
        verify(sql, never()).prepared(any(), any(), any(Handler.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testClearingTheEndDateMakesTheBadgePermanentAgain() {
        givenReplies(false, new JsonObject().put("id", 9L));

        assertTrue(service.updateValidity(TYPE_ID, MY_STRUCTURES, null).succeeded());

        // Permanent: nothing to compare with the current date, so no past check at all.
        verify(sql, never()).prepared(eq(PAST_CHECK), any(), any(Handler.class));
        verify(sql).prepared(eq(expectedUpdate()),
                eq(new JsonArray().addNull().add(TYPE_ID).add("structure1").add("structure2")), any(Handler.class));
    }

    @Test
    public void testTheApplicableEndDateIsExposedOnTheBadgeTypeSetting() throws Exception {
        String validUntil = "2020-01-31";
        when(badgeProtagonistSettingService.getRelationsSetting(TYPE_ID, MY_STRUCTURES))
                .thenReturn(Future.succeededFuture(SettingHelper.getDefaultTypeSetting()));
        when(badgeTypeSettingService.findApplicableSetting(TYPE_ID, MY_STRUCTURES))
                .thenReturn(Future.succeededFuture(Optional.of(new BadgeTypeSetting(new JsonObject()
                        .put(Field.IS_SELF_ASSIGNABLE, true)
                        .put(Field.VALID_UNTIL, validUntil)
                        .put(Field.IS_EXPIRED, true)))));
        BadgeType badgeType = new BadgeType(new JsonObject().put(Field.ID, TYPE_ID));

        Future<Void> result = Whitebox.invokeMethod(service, "getSetting", badgeType, MY_STRUCTURES);

        assertTrue(result.succeeded());
        JsonObject setting = badgeType.toJson().getJsonObject(Field.SETTING);
        assertEquals(validUntil, setting.getString(Field.VALIDUNTIL));
        // The SQL-computed flag is passed through as is: the client never compares dates itself.
        assertTrue(setting.getBoolean(Field.ISEXPIRED));
        assertTrue(setting.getBoolean(Field.ISSELFASSIGNABLE));
    }

    @Test
    public void testAnUnconfiguredBadgeTypeIsPermanentAndNotSelfAssignable() throws Exception {
        when(badgeProtagonistSettingService.getRelationsSetting(TYPE_ID, MY_STRUCTURES))
                .thenReturn(Future.succeededFuture(SettingHelper.getDefaultTypeSetting()));
        when(badgeTypeSettingService.findApplicableSetting(TYPE_ID, MY_STRUCTURES))
                .thenReturn(Future.succeededFuture(Optional.empty()));
        BadgeType badgeType = new BadgeType(new JsonObject().put(Field.ID, TYPE_ID));

        Future<Void> result = Whitebox.invokeMethod(service, "getSetting", badgeType, MY_STRUCTURES);

        assertTrue(result.succeeded());
        JsonObject setting = badgeType.toJson().getJsonObject(Field.SETTING);
        assertNull(setting.getString(Field.VALIDUNTIL));
        assertFalse(setting.getBoolean(Field.ISEXPIRED));
        assertFalse(setting.getBoolean(Field.ISSELFASSIGNABLE));
    }
}
