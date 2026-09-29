package fr.openent.minibadge.security;

import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.core.constants.UserType;
import fr.openent.minibadge.helper.SettingHelper;
import fr.openent.minibadge.model.BadgeProtagonistSetting;
import fr.openent.minibadge.model.BadgeProtagonistSettingRelation;
import fr.openent.minibadge.model.TypeSetting;
import fr.openent.minibadge.model.User;
import fr.openent.minibadge.service.BadgeProtagonistSettingService;
import fr.openent.minibadge.service.BadgeTypeSettingService;
import fr.openent.minibadge.service.ServiceRegistry;
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

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.when;

/**
 * Task 3 / Task 6 validation for the real authorization gate (@ResourceFilter on
 * POST /types/:typeId/assign): UsersAssignRight#getTypeSetting is private, so it is
 * invoked here through reflection (Whitebox) - it was already fully async
 * (Future&lt;TypeSetting&gt;) before this epic, wrapping a synchronous
 * SettingHelper.getDefaultTypeSetting() call; this test proves the same Future-based
 * signature now carries a real, SQL-seeded Teacher->Student relation through to
 * SettingHelper.isAuthorizedToAssign, and that the fallback path (relation lookup
 * failure) still preserves the pre-epic Student->Student behaviour.
 */
@RunWith(VertxUnitRunner.class)
public class UsersAssignRightTest {

    /**
     * The assignor's own structures: getTypeSetting now forwards them so a badge type created by
     * the assignor's establishment reads its own settings instead of only the centralized ones.
     */
    private static final List<String> STRUCTURES = Collections.singletonList("structure1");

    @Mock
    private BadgeTypeSettingService badgeTypeSettingService;
    @Mock
    private BadgeProtagonistSettingService badgeProtagonistSettingService;

    private UsersAssignRight usersAssignRight;

    @Before
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        ServiceRegistry.registerService(BadgeTypeSettingService.class, badgeTypeSettingService);
        ServiceRegistry.registerService(BadgeProtagonistSettingService.class, badgeProtagonistSettingService);
        usersAssignRight = new UsersAssignRight();
    }

    private static BadgeProtagonistSetting profileSetting(String value) {
        return new BadgeProtagonistSetting(new JsonObject()
                .put(Field.TYPE, Field.PROFILE)
                .put(Field.TYPEVALUE, value)
                .put(Field.LABEL, value));
    }

    private static User userOfType(String id, String type) {
        return new User(new JsonObject().put(Field.ID, id).put(Field.TYPE, type));
    }

    @Test
    public void testTeacherIsNowAuthorizedToAssignToStudentWhenRelationIsSeeded() throws Exception {
        TypeSetting seededSetting = new TypeSetting(Arrays.asList(
                new BadgeProtagonistSettingRelation(profileSetting(UserType.STUDENT), profileSetting(UserType.STUDENT)),
                new BadgeProtagonistSettingRelation(profileSetting(UserType.TEACHER), profileSetting(UserType.STUDENT))
        ));

        when(badgeProtagonistSettingService.getRelationsSetting(1L, STRUCTURES)).thenReturn(Future.succeededFuture(seededSetting));
        when(badgeTypeSettingService.isBadgeTypeSelfAssignable(1L, STRUCTURES)).thenReturn(Future.succeededFuture(false));

        Future<TypeSetting> resultFuture = Whitebox.invokeMethod(usersAssignRight, "getTypeSetting", 1L, STRUCTURES);
        assertTrue(resultFuture.succeeded());
        TypeSetting typeSetting = resultFuture.result();

        User teacher = userOfType("teacher1", UserType.TEACHER);
        User student = userOfType("student1", UserType.STUDENT);
        User personnel = userOfType("personnel1", UserType.PERSONNEL);

        assertTrue("A teacher must now be authorized to assign to a student",
                SettingHelper.isAuthorizedToAssign(teacher, student, typeSetting));
        assertFalse("A profile not part of any seeded relation must still be refused",
                SettingHelper.isAuthorizedToAssign(personnel, student, typeSetting));
    }

    @Test
    public void testStudentToStudentBehaviourUnchangedWhenNoRelationSeeded() throws Exception {
        // Backward compatibility: badgeProtagonistSettingService itself already falls back
        // to SettingHelper.getDefaultTypeSetting() internally when unseeded (Task 2) - this
        // exercises that exact default value flowing back through getTypeSetting unchanged.
        when(badgeProtagonistSettingService.getRelationsSetting(2L, STRUCTURES))
                .thenReturn(Future.succeededFuture(SettingHelper.getDefaultTypeSetting()));
        when(badgeTypeSettingService.isBadgeTypeSelfAssignable(2L, STRUCTURES)).thenReturn(Future.succeededFuture(false));

        Future<TypeSetting> resultFuture = Whitebox.invokeMethod(usersAssignRight, "getTypeSetting", 2L, STRUCTURES);
        TypeSetting typeSetting = resultFuture.result();

        User assignorStudent = userOfType("student1", UserType.STUDENT);
        User receiverStudent = userOfType("student2", UserType.STUDENT);
        User teacher = userOfType("teacher1", UserType.TEACHER);

        assertTrue("Pre-epic Student->Student behaviour must still work",
                SettingHelper.isAuthorizedToAssign(assignorStudent, receiverStudent, typeSetting));
        assertFalse("Without a seeded relation, a teacher must not be authorized",
                SettingHelper.isAuthorizedToAssign(teacher, receiverStudent, typeSetting));
    }

    @Test
    public void testGetTypeSettingFallsBackToDefaultOnOutrightFailure() throws Exception {
        when(badgeProtagonistSettingService.getRelationsSetting(3L, STRUCTURES))
                .thenReturn(Future.failedFuture("db error"));
        when(badgeTypeSettingService.isBadgeTypeSelfAssignable(3L, STRUCTURES))
                .thenReturn(Future.succeededFuture(true));

        Future<TypeSetting> resultFuture = Whitebox.invokeMethod(usersAssignRight, "getTypeSetting", 3L, STRUCTURES);
        assertTrue(resultFuture.succeeded());

        User assignorStudent = userOfType("student1", UserType.STUDENT);
        User receiverStudent = userOfType("student2", UserType.STUDENT);
        assertTrue("A relation lookup failure must never break assignment for the default relation",
                SettingHelper.isAuthorizedToAssign(assignorStudent, receiverStudent, resultFuture.result()));
    }
}
