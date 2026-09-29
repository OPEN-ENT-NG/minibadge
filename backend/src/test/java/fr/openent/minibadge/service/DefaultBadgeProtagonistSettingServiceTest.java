package fr.openent.minibadge.service;

import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.core.constants.UserType;
import fr.openent.minibadge.model.BadgeProtagonistSettingRow;
import fr.openent.minibadge.model.TypeSetting;
import fr.openent.minibadge.repository.BadgeProtagonistSettingRepository;
import fr.openent.minibadge.service.impl.DefaultBadgeProtagonistSettingService;
import io.vertx.core.Future;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.unit.junit.VertxUnitRunner;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.powermock.reflect.Whitebox;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.Assert.*;
import static org.mockito.Mockito.when;

/**
 * Task 2 validation: DefaultBadgeProtagonistSettingService rebuilds the
 * SENDER_PROFILE x TARGET_PROFILE cartesian product from raw rows, and falls back to
 * SettingHelper.getDefaultTypeSetting() (Student->Student) whenever there is nothing
 * usable to build relations from - this is the explicit backward-compatibility
 * safety net for badge types not (yet) seeded with badge_protagonist_setting rows.
 * <p>
 * The repository is swapped for a mock on the singleton instance via Whitebox, since
 * DefaultBadgeProtagonistSettingService (like every other *Service in this codebase)
 * resolves it eagerly through RepositoryFactory with no constructor injection hook.
 */
@RunWith(VertxUnitRunner.class)
public class DefaultBadgeProtagonistSettingServiceTest {

    @Mock
    private BadgeProtagonistSettingRepository badgeProtagonistSettingRepository;

    private BadgeProtagonistSettingService service;

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        service = DefaultBadgeProtagonistSettingService.getInstance();
        Whitebox.setInternalState(service, "badgeProtagonistSettingRepository", badgeProtagonistSettingRepository);
    }

    private static BadgeProtagonistSettingRow row(long id, String protagonistTypeId, String protagonistType) {
        return new BadgeProtagonistSettingRow(new JsonObject()
                .put("id", id)
                .put("protagonist_type_id", protagonistTypeId)
                .put("protagonist_type", protagonistType));
    }

    @Test
    public void testFallsBackToDefaultSettingWhenNoRowFound() {
        when(badgeProtagonistSettingRepository.findByBadgeTypeId(1L))
                .thenReturn(Future.succeededFuture(Collections.emptyList()));

        TypeSetting result = service.getRelationsSetting(1L).result();

        assertEquals(1, result.relations().size());
        assertEquals(UserType.STUDENT, result.relations().get(0).assignor().typeValue());
        assertEquals(UserType.STUDENT, result.relations().get(0).receiver().typeValue());
    }

    @Test
    public void testFallsBackToDefaultSettingWhenOnlyAudienceRowsFound() {
        // Only *_AUDIENCE rows: SENDER_PROFILE/TARGET_PROFILE sets are both empty,
        // so there is nothing usable to build a relation from -> defensive fallback.
        when(badgeProtagonistSettingRepository.findByBadgeTypeId(2L))
                .thenReturn(Future.succeededFuture(Collections.singletonList(
                        row(1L, "someAudienceId", Field.SENDER_AUDIENCE))));

        TypeSetting result = service.getRelationsSetting(2L).result();

        assertEquals(1, result.relations().size());
        assertEquals(UserType.STUDENT, result.relations().get(0).assignor().typeValue());
        assertEquals(UserType.STUDENT, result.relations().get(0).receiver().typeValue());
    }

    @Test
    public void testSingleStudentToStudentPair() {
        when(badgeProtagonistSettingRepository.findByBadgeTypeId(3L))
                .thenReturn(Future.succeededFuture(Arrays.asList(
                        row(1L, UserType.STUDENT, Field.SENDER_PROFILE),
                        row(2L, UserType.STUDENT, Field.TARGET_PROFILE))));

        TypeSetting result = service.getRelationsSetting(3L).result();

        assertEquals(1, result.relations().size());
        assertEquals(UserType.STUDENT, result.relations().get(0).assignor().typeValue());
        assertEquals(UserType.STUDENT, result.relations().get(0).receiver().typeValue());
    }

    @Test
    public void testTeacherAndStudentToStudentCartesianProduct() {
        // The target scenario for this epic: Student and Teacher as authorized
        // assignors, Student as the only authorized receiver -> exactly 2 relations
        // (Student->Student, Teacher->Student), not 1 (missing Teacher) nor 4
        // (a spurious Student/Teacher x Student/Teacher product).
        when(badgeProtagonistSettingRepository.findByBadgeTypeId(4L))
                .thenReturn(Future.succeededFuture(Arrays.asList(
                        row(1L, UserType.STUDENT, Field.SENDER_PROFILE),
                        row(2L, UserType.TEACHER, Field.SENDER_PROFILE),
                        row(3L, UserType.STUDENT, Field.TARGET_PROFILE))));

        TypeSetting result = service.getRelationsSetting(4L).result();

        List<String> assignorTypeValues = Arrays.asList(
                result.relations().get(0).assignor().typeValue(),
                result.relations().get(1).assignor().typeValue());

        assertEquals(2, result.relations().size());
        assertTrue(assignorTypeValues.contains(UserType.STUDENT));
        assertTrue(assignorTypeValues.contains(UserType.TEACHER));
        result.relations().forEach(relation ->
                assertEquals(UserType.STUDENT, relation.receiver().typeValue()));
    }

    @Test
    public void testPropagatesRepositoryFailure() {
        when(badgeProtagonistSettingRepository.findByBadgeTypeId(5L))
                .thenReturn(Future.failedFuture("boom"));

        Future<TypeSetting> resultFuture = service.getRelationsSetting(5L);

        assertTrue(resultFuture.failed());
    }
}
