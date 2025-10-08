package fr.openent.minibadge.helper;

import fr.openent.minibadge.Minibadge;
import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.core.constants.UserType;
import fr.openent.minibadge.model.*;
import io.vertx.core.json.JsonObject;

import java.util.Collections;
import java.util.List;

public class SettingHelper {
    private SettingHelper() {
        throw new IllegalStateException("Utility class");
    }

    public static TypeSetting getDefaultTypeSetting() {
        return new TypeSetting(Collections.singletonList(getDefaultRelationsSetting()));
    }

    public static BadgeProtagonistSettingRelation getDefaultRelationsSetting() {
        return new BadgeProtagonistSettingRelation(getDefaultProtagonistSetting(), getDefaultProtagonistSetting());
    }

    public static BadgeProtagonistSetting getDefaultProtagonistSetting() {
        return new BadgeProtagonistSetting(
                new JsonObject()
                        .put(Field.TYPE, Field.PROFILE)
                        .put(Field.TYPEVALUE, UserType.STUDENT)
                        .put(Field.LABEL, UserType.STUDENT)
        );
    }


    public static boolean isAuthorizedToAssign(User assignor, List<User> receivers, TypeSetting typeSetting) {
        return receivers
                .stream()
                .allMatch(receiver -> isAuthorizedToAssign(assignor, receiver, typeSetting));
    }

    public static boolean isAuthorizedToAssign(User assignor, User receiver, TypeSetting typeSetting) {
        return typeSetting.relations()
                .stream()
                .anyMatch((setting ->
                        isRelationAuthorized(assignor, setting.assignor())
                                && isRelationAuthorized(receiver, setting.receiver())
                ));
    }

    public static boolean isRelationAuthorized(User user, BadgeProtagonistSetting relation) {
        switch (relation.type()) {
            case Field.PROFILE:
                return relation.typeValue().equals(user.getType());
            default:
                return false;
        }
    }

    public static List<ThresholdSetting> getDefaultBadgeSettings() {
        return Collections.singletonList(new ThresholdSetting(
                new JsonObject()
                        .put(Field.MAXASSIGNABLE, Minibadge.minibadgeConfig.defaultMaxAssignable())
                        .put(Field.PERIODASSIGNABLE, Minibadge.minibadgeConfig.defaultPeriodAssignable())
        ));
    }

}
