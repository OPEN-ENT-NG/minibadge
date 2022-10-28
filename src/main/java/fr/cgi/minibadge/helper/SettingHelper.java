package fr.cgi.minibadge.helper;

import fr.cgi.minibadge.core.constants.Field;
import fr.cgi.minibadge.core.constants.UserType;
import fr.cgi.minibadge.model.BadgeProtagonistSetting;
import fr.cgi.minibadge.model.BadgeProtagonistSettingRelation;
import fr.cgi.minibadge.model.BadgeSetting;
import fr.cgi.minibadge.model.User;
import io.vertx.core.json.JsonObject;

import java.util.Collections;
import java.util.List;

public class SettingHelper {
    private SettingHelper() {
        throw new IllegalStateException("Utility class");
    }

    public static BadgeSetting getDefaultBadgeSetting() {
        return new BadgeSetting(Collections.singletonList(getDefaultRelationsSetting()));
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


    public static boolean isAuthorizedToAssign(User assignor, List<User> receivers, BadgeSetting badgeSetting) {
        return receivers
                .stream()
                .allMatch(receiver -> isAuthorizedToAssign(assignor, receiver, badgeSetting));
    }

    public static boolean isAuthorizedToAssign(User assignor, User receiver, BadgeSetting badgeSetting) {
        return badgeSetting.relations()
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
}
