package fr.openent.minibadge.service;

import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.core.enums.SqlTable;
import fr.openent.minibadge.helper.SqlHelper;
import fr.openent.minibadge.model.ThresholdSetting;
import fr.openent.minibadge.model.User;
import fr.openent.minibadge.service.impl.DefaultStatisticService;
import fr.openent.minibadge.service.impl.DefaultUserService;
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
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;
import org.powermock.reflect.Whitebox;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Scanner;

import static org.junit.Assert.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;

/**
 * Epic C, the risk the plan ranks first: quotas and statistics must KEEP counting expired
 * assignments. A badge given today counts against today's quota even if it expires tomorrow, and
 * statistics are historical. Both read {@code badge_assigned_valid} (non-revoked, expired included);
 * only the "currently held" read paths moved to the new {@code badge_assigned_active}.
 * <p>
 * Two layers pin that down: the generated SQL of the quota and statistics paths still reads
 * badge_assigned_valid, and migration 024 leaves that view's definition alone. The database-level
 * behaviour (an expired assignment still counted by both queries) was verified against PostgreSQL.
 */
@RunWith(VertxUnitRunner.class)
public class ExpiredAssignmentsStillCountTest {

    private static final List<String> STRUCTURES = Collections.singletonList("structure1");

    @Mock
    private Sql sql;

    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        registerIfAbsent(UserService.class);
        registerIfAbsent(StructureService.class);
        registerIfAbsent(BadgeProtagonistSettingService.class);
        doNothing().when(sql).prepared(any(), any(), any(Handler.class));
    }

    private static <T> void registerIfAbsent(Class<T> clazz) {
        try {
            ServiceRegistry.getService(clazz);
        } catch (IllegalArgumentException e) {
            ServiceRegistry.registerService(clazz, Mockito.mock(clazz));
        }
    }

    private static UserInfos assignor() {
        UserInfos user = new User(new JsonObject().put(Field.ID, "assignor1"));
        user.setStructures(STRUCTURES);
        return user;
    }

    @Test
    public void testTheQuotaStillCountsExpiredAssignmentsOfThePeriod() {
        JsonArray params = new JsonArray();

        String threshold = SqlHelper.getCTEThreshold("YYYY-MM-DD", assignor(), params);

        assertEquals("SELECT COUNT(id) FROM " + SqlTable.BADGE_ASSIGNED_VALID.getName() + " " +
                " WHERE to_char(now(), 'YYYY-MM-DD') = to_char(created_at, 'YYYY-MM-DD') AND assignor_id = ?", threshold);
        assertEquals(new JsonArray().add("assignor1"), params);
    }

    @Test
    public void testBothQuotaCallersStillReadTheNonRevokedView() {
        // UsersAssignRight (the gate on POST /types/:typeId/assign) and DefaultSettingService (the
        // remaining count shown to the user) both build on getCTEThreshold, through these two helpers.
        List<ThresholdSetting> settings = Collections.singletonList(new ThresholdSetting(new JsonObject()
                .put(Field.MAXASSIGNABLE, 3).put(Field.PERIODASSIGNABLE, "DAY")));

        String reached = SqlHelper.getPartitionsThresholdsReachedRequests(settings, assignor(), new JsonArray());
        String byPeriod = SqlHelper.getCTEThresholdsRequests(settings, assignor(), new JsonArray());

        for (String query : Arrays.asList(reached, byPeriod)) {
            assertTrue(query.contains(SqlTable.BADGE_ASSIGNED_VALID.getName()));
            assertFalse(query.contains(SqlTable.BADGE_ASSIGNED_ACTIVE.getName()));
        }
    }

    private String captureQuery() {
        ArgumentCaptor<String> query = ArgumentCaptor.forClass(String.class);
        verify(sql).prepared(query.capture(), any(), any(Handler.class));
        return query.getValue();
    }

    @Test
    public void testStatisticsStillCountExpiredAssignments() throws Exception {
        StatisticService statisticService = DefaultStatisticService.getInstance();
        Whitebox.setInternalState(statisticService, "sql", sql);

        Whitebox.invokeMethod(statisticService, "countBadgeAssigned",
                new Class<?>[]{List.class, java.time.LocalDate.class}, STRUCTURES, null);

        String query = captureQuery();
        assertTrue(query.contains(" INNER JOIN " + SqlTable.BADGE_ASSIGNED_VALID.getName() + " ba on ba.id = bas.badge_assigned_id "));
        assertFalse(query.contains(SqlTable.BADGE_ASSIGNED_ACTIVE.getName()));
    }

    @Test
    public void testMostAssignedTypesStatisticsStillCountExpiredAssignments() throws Exception {
        StatisticService statisticService = DefaultStatisticService.getInstance();
        Whitebox.setInternalState(statisticService, "sql", sql);

        Whitebox.invokeMethod(statisticService, "badgeTypesWithCountAssigned",
                new Class<?>[]{List.class, Boolean.class, Integer.class}, STRUCTURES, true, 5);

        String query = captureQuery();
        assertTrue(query.contains(" INNER JOIN " + SqlTable.BADGE_ASSIGNED_VALID.getName() + " ba on b.id = ba.badge_id "));
        assertFalse(query.contains(SqlTable.BADGE_ASSIGNED_ACTIVE.getName()));
    }

    @Test
    public void testUsersSearchAlreadyAssignedByMeIgnoresExpiredAssignments() throws Exception {
        UserService userService = DefaultUserService.getInstance();
        JsonArray params = new JsonArray();

        String query = Whitebox.invokeMethod(userService, "getAlreadyOwnerIdTypedAssignedFromUserQuery",
                7L, assignor(), Arrays.asList("owner1", "owner2"), params);

        // An expired assignment must not grey the person out of the search: they can be re-awarded.
        assertEquals(" SELECT DISTINCT(owner_id) as id " +
                " FROM " + SqlTable.BADGE_ASSIGNED_ACTIVE.getName() + " bav INNER JOIN " + SqlTable.BADGE.getName() +
                " b on b.id = bav.badge_id " +
                " WHERE assignor_id = ? AND badge_type_id = ? AND owner_id IN (?,?)", query);
        assertEquals(new JsonArray().add("assignor1").add(7L).add("owner1").add("owner2"), params);
    }

    private static String migration024() {
        InputStream stream = ExpiredAssignmentsStillCountTest.class.getClassLoader()
                .getResourceAsStream("sql/024-badge-validity.sql");
        assertNotNull("sql/024-badge-validity.sql must be on the classpath", stream);
        try (Scanner scanner = new Scanner(stream, StandardCharsets.UTF_8.name()).useDelimiter("\\A")) {
            return scanner.hasNext() ? scanner.next() : "";
        }
    }

    /** SQL statements only: `--` comments are free to mention badge_assigned_valid to explain why it is left alone. */
    private static String migration024Statements() {
        return Arrays.stream(migration024().split("\n"))
                .filter(line -> !line.trim().startsWith("--"))
                .reduce("", (acc, line) -> acc + line + "\n");
    }

    @Test
    public void testMigration024LeavesTheNonRevokedViewUntouched() {
        String statements = migration024Statements();

        assertFalse("badge_assigned_valid feeds quotas and statistics: it must not gain an expiry filter",
                statements.contains("badge_assigned_valid"));
        assertTrue(statements.contains("CREATE OR REPLACE VIEW minibadge.badge_assigned_active"));
        assertTrue(statements.contains("AND (expires_at IS NULL OR expires_at > now())"));
    }

    @Test
    public void testMigration024KeepsPermanentDuplicatesCollidingInTheUniqueIndex() {
        String statements = migration024Statements();

        // NULLs are distinct in a unique index: without the COALESCE two permanent assignments of the
        // same badge by the same assignor would no longer collide.
        assertTrue(statements.contains(
                "ON minibadge.badge_assigned (badge_id, assignor_id, COALESCE(expires_at, 'infinity'::timestamp))"));
        assertTrue(statements.contains("WHERE revoked_at IS NULL;"));
    }
}
