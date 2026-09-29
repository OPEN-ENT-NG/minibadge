package fr.openent.minibadge.helper;

import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.core.constants.UserType;
import fr.openent.minibadge.model.BadgeProtagonistSetting;
import fr.openent.minibadge.model.BadgeProtagonistSettingRelation;
import fr.openent.minibadge.model.TypeSetting;
import fr.openent.minibadge.model.User;
import io.vertx.core.json.JsonObject;
import org.junit.Test;

import java.util.Arrays;
import java.util.Collections;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

/**
 * Baseline regression coverage for SettingHelper - none existed before this epic
 * (see plan Risks table: "Aucune couverture de test existante sur SettingHelper...
 * pour partir d'une base sure"). Pins down the pre-existing, generic
 * isRelationAuthorized/isAuthorizedToAssign matching mechanism (untouched by this
 * epic) and the Student->Student default it still produces.
 */
public class SettingHelperTest {

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
    public void testGetDefaultTypeSettingIsStudentToStudentOnly() {
        TypeSetting defaultSetting = SettingHelper.getDefaultTypeSetting();

        assertTrue(defaultSetting.relations().size() == 1);
        assertTrue(defaultSetting.relations().get(0).assignor().typeValue().equals(UserType.STUDENT));
        assertTrue(defaultSetting.relations().get(0).receiver().typeValue().equals(UserType.STUDENT));
    }

    @Test
    public void testIsRelationAuthorizedMatchesOnProfileTypeValue() {
        BadgeProtagonistSetting studentRelation = profileSetting(UserType.STUDENT);

        assertTrue(SettingHelper.isRelationAuthorized(userOfType("u1", UserType.STUDENT), studentRelation));
        assertFalse(SettingHelper.isRelationAuthorized(userOfType("u1", UserType.TEACHER), studentRelation));
    }

    @Test
    public void testIsRelationAuthorizedRefusesUnknownRelationType() {
        BadgeProtagonistSetting unknownTypeRelation = new BadgeProtagonistSetting(new JsonObject()
                .put(Field.TYPE, "unknown")
                .put(Field.TYPEVALUE, UserType.STUDENT)
                .put(Field.LABEL, UserType.STUDENT));

        assertFalse(SettingHelper.isRelationAuthorized(userOfType("u1", UserType.STUDENT), unknownTypeRelation));
    }

    @Test
    public void testIsAuthorizedToAssignWithDefaultSetting() {
        TypeSetting defaultSetting = SettingHelper.getDefaultTypeSetting().setSelfAssignable(false);

        assertTrue("Student assigning to a different Student must be authorized",
                SettingHelper.isAuthorizedToAssign(
                        userOfType("student1", UserType.STUDENT),
                        userOfType("student2", UserType.STUDENT),
                        defaultSetting));

        assertFalse("Teacher must not be authorized without a seeded Teacher relation",
                SettingHelper.isAuthorizedToAssign(
                        userOfType("teacher1", UserType.TEACHER),
                        userOfType("student1", UserType.STUDENT),
                        defaultSetting));
    }

    @Test
    public void testIsAuthorizedToAssignRefusesSelfAssignWhenNotSelfAssignable() {
        TypeSetting defaultSetting = SettingHelper.getDefaultTypeSetting().setSelfAssignable(false);
        User student = userOfType("student1", UserType.STUDENT);

        assertFalse(SettingHelper.isAuthorizedToAssign(student, student, defaultSetting));
    }

    @Test
    public void testIsAuthorizedToAssignAllowsSelfAssignWhenSelfAssignable() {
        TypeSetting defaultSetting = SettingHelper.getDefaultTypeSetting().setSelfAssignable(true);
        User student = userOfType("student1", UserType.STUDENT);

        assertTrue(SettingHelper.isAuthorizedToAssign(student, student, defaultSetting));
    }

    @Test
    public void testIsAuthorizedToAssignWithTeacherToStudentRelationSeeded() {
        TypeSetting seededSetting = new TypeSetting(Arrays.asList(
                new BadgeProtagonistSettingRelation(profileSetting(UserType.STUDENT), profileSetting(UserType.STUDENT)),
                new BadgeProtagonistSettingRelation(profileSetting(UserType.TEACHER), profileSetting(UserType.STUDENT))
        )).setSelfAssignable(false);

        assertTrue("Teacher->Student must be authorized once seeded",
                SettingHelper.isAuthorizedToAssign(
                        userOfType("teacher1", UserType.TEACHER),
                        userOfType("student1", UserType.STUDENT),
                        seededSetting));
        assertFalse("Teacher assigning to another Teacher must still be refused (no such relation seeded)",
                SettingHelper.isAuthorizedToAssign(
                        userOfType("teacher1", UserType.TEACHER),
                        userOfType("teacher2", UserType.TEACHER),
                        seededSetting));
    }

    @Test
    public void testIsAuthorizedToAssignMultipleReceiversRequiresAllAuthorized() {
        TypeSetting defaultSetting = SettingHelper.getDefaultTypeSetting().setSelfAssignable(false);
        User assignor = userOfType("student1", UserType.STUDENT);

        assertTrue(SettingHelper.isAuthorizedToAssign(assignor,
                Arrays.asList(userOfType("student2", UserType.STUDENT), userOfType("student3", UserType.STUDENT)),
                defaultSetting));

        assertFalse("One unauthorized receiver must refuse the whole batch",
                SettingHelper.isAuthorizedToAssign(assignor,
                        Arrays.asList(userOfType("student2", UserType.STUDENT), userOfType("teacher1", UserType.TEACHER)),
                        defaultSetting));
    }

    @Test
    public void testIsAuthorizedToAssignWithEmptyRelationsIsAlwaysRefused() {
        TypeSetting emptySetting = new TypeSetting(Collections.emptyList()).setSelfAssignable(false);

        assertFalse(SettingHelper.isAuthorizedToAssign(
                userOfType("student1", UserType.STUDENT),
                userOfType("student2", UserType.STUDENT),
                emptySetting));
    }
}
