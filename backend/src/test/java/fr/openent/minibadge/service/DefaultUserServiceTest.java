package fr.openent.minibadge.service;

import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.core.constants.UserType;
import fr.openent.minibadge.model.BadgeProtagonistSetting;
import fr.openent.minibadge.model.BadgeProtagonistSettingRelation;
import fr.openent.minibadge.model.TypeSetting;
import fr.openent.minibadge.model.User;
import fr.openent.minibadge.service.impl.DefaultUserService;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.unit.junit.VertxUnitRunner;
import org.entcore.common.user.UserInfos;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mockito;
import org.powermock.reflect.Whitebox;

import java.util.Arrays;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

/**
 * Task 3 validation for the third call site: DefaultUserService#mapToAuthorizedAssignUsers
 * used to hardcode SettingHelper.getDefaultTypeSetting() with the comment "We currently
 * consider that all types have default setting" (now removed - see search()). It is now a
 * pure function of an injected TypeSetting, so it is tested directly through reflection
 * (Whitebox) without needing to mock Neo4j/UserUtils.findVisibleUsers.
 */
@RunWith(VertxUnitRunner.class)
public class DefaultUserServiceTest {

    @Before
    public void setUp() {
        // DefaultUserService (a static-field singleton) now resolves BadgeProtagonistSettingService
        // eagerly through ServiceRegistry at construction time (mirrors the existing
        // UsersAssignRight/DefaultBadgeTypeService convention) - make sure it is registered before
        // DefaultUserService.getInstance() triggers that class's static initializer, regardless of
        // whether an earlier test in this JVM already loaded the class.
        if (!isRegistered(BadgeProtagonistSettingService.class)) {
            ServiceRegistry.registerService(BadgeProtagonistSettingService.class,
                    Mockito.mock(BadgeProtagonistSettingService.class));
        }
    }

    private static boolean isRegistered(Class<?> clazz) {
        try {
            ServiceRegistry.getService(clazz);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private static JsonObject candidate(String id, String type) {
        return new JsonObject()
                .put(Field.ID, id)
                .put(Field.TYPE, type)
                .put(Field.VALIDATECHART, "true")
                .put(Field.ACCEPTRECEIVE, "true");
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testTeacherAssignorAuthorizedForStudentReceiverOnlyWhenRelationSeeded() throws Exception {
        DefaultUserService userService = (DefaultUserService) DefaultUserService.getInstance();

        BadgeProtagonistSetting teacherSetting = new BadgeProtagonistSetting(new JsonObject()
                .put(Field.TYPE, Field.PROFILE).put(Field.TYPEVALUE, UserType.TEACHER).put(Field.LABEL, UserType.TEACHER));
        BadgeProtagonistSetting studentSetting = new BadgeProtagonistSetting(new JsonObject()
                .put(Field.TYPE, Field.PROFILE).put(Field.TYPEVALUE, UserType.STUDENT).put(Field.LABEL, UserType.STUDENT));
        TypeSetting typeSetting = new TypeSetting(Arrays.asList(
                new BadgeProtagonistSettingRelation(studentSetting, studentSetting),
                new BadgeProtagonistSettingRelation(teacherSetting, studentSetting)
        ));

        UserInfos teacherAssignor = new User(new JsonObject().put(Field.ID, "teacher1").put(Field.TYPE, UserType.TEACHER));

        JsonArray queriedUsers = new JsonArray()
                .add(candidate("student1", UserType.STUDENT))
                .add(candidate("teacher2", UserType.TEACHER));

        List<User> authorized = Whitebox.invokeMethod(userService, "mapToAuthorizedAssignUsers",
                teacherAssignor, queriedUsers, typeSetting);

        assertEquals(1, authorized.size());
        assertEquals("student1", authorized.get(0).getUserId());
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testTeacherAssignorNotAuthorizedWithDefaultSettingOnly() throws Exception {
        DefaultUserService userService = (DefaultUserService) DefaultUserService.getInstance();

        TypeSetting defaultSetting = fr.openent.minibadge.helper.SettingHelper.getDefaultTypeSetting();

        UserInfos teacherAssignor = new User(new JsonObject().put(Field.ID, "teacher1").put(Field.TYPE, UserType.TEACHER));
        JsonArray queriedUsers = new JsonArray().add(candidate("student1", UserType.STUDENT));

        List<User> authorized = Whitebox.invokeMethod(userService, "mapToAuthorizedAssignUsers",
                teacherAssignor, queriedUsers, defaultSetting);

        assertTrue("Without a seeded Teacher relation, a teacher assignor gets no authorized receivers",
                authorized.isEmpty());
    }
}
