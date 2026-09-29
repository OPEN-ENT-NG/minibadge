package fr.openent.minibadge.service;

import fr.openent.minibadge.core.enums.SqlTable;
import fr.openent.minibadge.model.BadgeType;
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

import static org.junit.Assert.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Epic B, Task 3: the badge type and its three levels of companion rows (badge_type_setting, then
 * badge_protagonist_setting, then rel_badge_category_badge_type) are created by ONE chained-CTE
 * statement.
 * <p>
 * Asserting on the generated SQL and its parameters is this repository's established convention for
 * SQL-level tests (see DefaultBadgeAssignedStructureServiceTest); there is no database in the test
 * suite. What matters here and is pinned below: a single statement is issued (atomicity — a partial
 * failure must not leave an orphan badge type behind, since minibadge has no delete endpoint at
 * all), every companion insert is present, `slug` is never sent (the trigger generates it), and the
 * default protagonist profiles match sql/022's centralized seed so a locally created badge behaves
 * like a central one.
 */
@RunWith(VertxUnitRunner.class)
public class DefaultBadgeTypeServiceCreateTest {

    @Mock
    private Sql sql;

    private BadgeTypeService service;

    @Before
    @SuppressWarnings("unchecked")
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        // DefaultBadgeTypeService resolves its collaborators eagerly through ServiceRegistry in its
        // constructor (no injection hook), so they must be registered before the singleton is first
        // touched. Registering only what it actually needs keeps this independent of
        // ServiceRegistry.initServices(), which would spin up every service in the app.
        ServiceRegistry.registerService(BadgeCategoryService.class, mock(BadgeCategoryService.class));
        ServiceRegistry.registerService(BadgeTypeSettingService.class, mock(BadgeTypeSettingService.class));
        ServiceRegistry.registerService(BadgeProtagonistSettingService.class, mock(BadgeProtagonistSettingService.class));
        ServiceRegistry.registerService(BadgeAssignedService.class, mock(BadgeAssignedService.class));

        service = DefaultBadgeTypeService.getInstance();
        Whitebox.setInternalState(service, "sql", sql);
        doNothing().when(sql).prepared(any(), any(), any(Handler.class));
    }

    private static BadgeType badgeType() {
        BadgeType badgeType = new BadgeType(new JsonObject()
                .put("label", "Entraide")
                .put("description", "Aide ses camarades")
                .put("descriptionShort", "Aide")
                .put("pictureId", "solidaire.svg"));
        badgeType.setStructureId("structure1");
        badgeType.setOwnerId("owner1");
        return badgeType;
    }

    private String captureQuery() {
        ArgumentCaptor<String> query = ArgumentCaptor.forClass(String.class);
        verify(sql).prepared(query.capture(), any(), any(Handler.class));
        return query.getValue();
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testCreateIssuesASingleChainedCteStatement() {
        service.create(badgeType(), Arrays.asList(2L, 4L));

        String expectedQuery = "WITH ins_type AS (" +
                " INSERT INTO " + SqlTable.BADGE_TYPE.getName() +
                " (structure_id, owner_id, picture_id, label, description, description_short)" +
                " VALUES (?, ?, ?, ?, ?, ?)" +
                " RETURNING id, slug, structure_id, owner_id, picture_id, label, description," +
                " description_short, created_at" +
                "), ins_setting AS (" +
                " INSERT INTO " + SqlTable.BADGE_TYPE_SETTING.getName() +
                " (structure_id, badge_type_id, is_self_assignable, valid_until)" +
                " SELECT ?, id, false, ?::date FROM ins_type" +
                " RETURNING id" +
                "), ins_protagonist AS (" +
                " INSERT INTO " + SqlTable.BADGE_PROTAGONIST_SETTING.getName() +
                " (badge_type_setting_id, protagonist_type_id, protagonist_type)" +
                " SELECT ins_setting.id, protagonist.protagonist_type_id, protagonist.protagonist_type" +
                " FROM ins_setting CROSS JOIN (VALUES " +
                "('Student', 'SENDER_PROFILE'), ('Teacher', 'SENDER_PROFILE'), ('Student', 'TARGET_PROFILE')" +
                ") AS protagonist (protagonist_type_id, protagonist_type)" +
                " RETURNING id" +
                "), ins_category AS (" +
                " INSERT INTO " + SqlTable.REL_BADGE_CATEGORY_BADGE_TYPE.getName() +
                " (badge_category_id, badge_type_id)" +
                " SELECT bc.id, ins_type.id FROM " + SqlTable.BADGE_CATEGORY.getName() + " bc" +
                " CROSS JOIN ins_type WHERE bc.id IN (?,?)" +
                " RETURNING badge_category_id" +
                ")" +
                " SELECT * FROM ins_type";

        JsonArray expectedParams = new JsonArray()
                .add("structure1")
                .add("owner1")
                .add("solidaire.svg")
                .add("Entraide")
                .add("Aide ses camarades")
                .add("Aide")
                .add("structure1")
                // Epic C: no end date submitted = permanent badge.
                .addNull()
                .add(2L)
                .add(4L);

        // Exactly ONE prepared() call: the four inserts are a single atomic statement, not a
        // sequence that could half-succeed.
        verify(sql, times(1)).prepared(eq(expectedQuery), eq(expectedParams), any(Handler.class));
    }

    @Test
    public void testCreateNeverSendsTheSlug() {
        service.create(badgeType(), Collections.emptyList());

        // The slug is generated by the badge_type trigger (sql/023-fix-badge-type-slug-trigger.sql);
        // sending one would bypass the de-duplication counter entirely. It is only ever read back.
        String query = captureQuery();
        String insertedColumns = query.substring(0, query.indexOf(" VALUES"));
        assertFalse(insertedColumns.contains("slug"));
        assertTrue(query.contains(" RETURNING id, slug,"));
    }

    @Test
    public void testCreateOmitsTheCategoryCteWhenNoCategoryIsSelected() {
        service.create(badgeType(), Collections.emptyList());

        String query = captureQuery();
        assertFalse("An empty IN () list is a syntax error - the CTE must be dropped instead",
                query.contains("ins_category"));
        assertTrue(query.contains("ins_protagonist"));
        assertTrue(query.endsWith(" SELECT * FROM ins_type"));
    }

    @Test
    public void testCreateTreatsNullCategoryListLikeAnEmptyOne() {
        service.create(badgeType(), null);

        assertFalse(captureQuery().contains("ins_category"));
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testCreateMapsAUniqueViolationToAnExplicitDuplicateError() {
        ArgumentCaptor<Handler<io.vertx.core.eventbus.Message<JsonObject>>> handler =
                ArgumentCaptor.forClass(Handler.class);

        Future<BadgeType> result = service.create(badgeType(), Collections.emptyList());
        verify(sql).prepared(any(), any(), handler.capture());
        handler.getValue().handle(errorMessage(
                "duplicate key value violates unique constraint \"badge_type_slug_key\""));

        assertTrue(result.failed());
        // Not the raw Postgres text and not an opaque 500: a stable key the controller renders as an
        // actionable "this label is already taken".
        assertEquals(BadgeTypeService.DUPLICATE_SLUG_ERROR, result.cause().getMessage());
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testCreateKeepsAnyOtherFailureAsIs() {
        ArgumentCaptor<Handler<io.vertx.core.eventbus.Message<JsonObject>>> handler =
                ArgumentCaptor.forClass(Handler.class);

        Future<BadgeType> result = service.create(badgeType(), Collections.emptyList());
        verify(sql).prepared(any(), any(), handler.capture());
        handler.getValue().handle(errorMessage("connection refused"));

        assertTrue(result.failed());
        assertNotEquals(BadgeTypeService.DUPLICATE_SLUG_ERROR, result.cause().getMessage());
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testCreateReturnsTheCreatedBadgeTypeWithItsGeneratedIdAndSlug() {
        ArgumentCaptor<Handler<io.vertx.core.eventbus.Message<JsonObject>>> handler =
                ArgumentCaptor.forClass(Handler.class);

        Future<BadgeType> result = service.create(badgeType(), Collections.emptyList());
        verify(sql).prepared(any(), any(), handler.capture());
        handler.getValue().handle(successMessage(new JsonObject()
                .put("id", 51L)
                .put("slug", "ENTRAIDE1")
                .put("structure_id", "structure1")
                .put("owner_id", "owner1")
                .put("label", "Entraide")));

        assertTrue(result.succeeded());
        assertEquals(Long.valueOf(51L), result.result().id());
        assertEquals("structure1", result.result().structureId());
        assertEquals("owner1", result.result().ownerId());
    }

    private static final String PAST_CHECK = "SELECT (?::date < CURRENT_DATE) AS is_past";

    /** The past-date check (database clock) answers {@code isPast}; the creation statement answers nothing. */
    private void givenPastCheck(boolean isPast) {
        FakeSqlReply.answer(sql, query -> query.equals(PAST_CHECK)
                ? FakeSqlReply.rows(new JsonObject().put("is_past", isPast))
                : FakeSqlReply.rows());
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testCreateStoresTheSubmittedEndDateOnTheEstablishmentSetting() {
        String validUntil = "2027-06-30";
        givenPastCheck(false);
        BadgeType badgeType = badgeType();
        badgeType.getSetting().setValidUntil(validUntil);

        service.create(badgeType, Collections.emptyList());

        verify(sql).prepared(eq(PAST_CHECK), eq(new JsonArray().add(validUntil)), any(Handler.class));
        ArgumentCaptor<String> queries = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<JsonArray> params = ArgumentCaptor.forClass(JsonArray.class);
        verify(sql, times(2)).prepared(queries.capture(), params.capture(), any(Handler.class));
        assertTrue(queries.getAllValues().get(1).startsWith("WITH ins_type AS ("));
        // Right after the setting's own structure_id: `SELECT ?, id, false, ?::date FROM ins_type`.
        assertEquals("structure1", params.getAllValues().get(1).getString(6));
        assertEquals(validUntil, params.getAllValues().get(1).getString(7));
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testCreateWithoutEndDateSkipsThePastCheck() {
        service.create(badgeType(), Collections.emptyList());

        verify(sql, never()).prepared(eq(PAST_CHECK), any(), any(Handler.class));
        assertTrue(captureQuery().startsWith("WITH ins_type AS ("));
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testCreateRefusesAnEndDateTheDatabaseClockSaysIsPast() {
        givenPastCheck(true);
        BadgeType badgeType = badgeType();
        badgeType.getSetting().setValidUntil("2026-09-28");

        Future<BadgeType> result = service.create(badgeType, Collections.emptyList());

        assertTrue(result.failed());
        assertEquals(BadgeTypeService.VALIDITY_PAST_ERROR, result.cause().getMessage());
        // Only the check ran: the badge type was never inserted.
        verify(sql, times(1)).prepared(any(), any(), any(Handler.class));
        verify(sql).prepared(eq(PAST_CHECK), any(), any(Handler.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testCreateRefusesAMalformedEndDateWithoutIssuingAnySql() {
        BadgeType badgeType = badgeType();
        badgeType.getSetting().setValidUntil("30/06/2027");

        Future<BadgeType> result = service.create(badgeType, Collections.emptyList());

        assertTrue(result.failed());
        assertEquals(BadgeTypeService.VALIDITY_INVALID_ERROR, result.cause().getMessage());
        verify(sql, never()).prepared(any(), any(), any(Handler.class));
    }

    /**
     * Fakes what the sql.persistor replies with, which is what
     * {@code SqlResult.validUniqueResultHandler} consumes.
     */
    private static io.vertx.core.eventbus.Message<JsonObject> successMessage(JsonObject row) {
        return message(new JsonObject()
                .put("status", "ok")
                .put("message", "")
                .put("results", new JsonArray().add(new JsonArray(new java.util.ArrayList<>(row.getMap().values()))))
                .put("fields", new JsonArray(new java.util.ArrayList<>(row.fieldNames()))));
    }

    private static io.vertx.core.eventbus.Message<JsonObject> errorMessage(String message) {
        return message(new JsonObject().put("status", "error").put("message", message));
    }

    @SuppressWarnings("unchecked")
    private static io.vertx.core.eventbus.Message<JsonObject> message(JsonObject body) {
        io.vertx.core.eventbus.Message<JsonObject> message = mock(io.vertx.core.eventbus.Message.class);
        when(message.body()).thenReturn(body);
        return message;
    }
}
