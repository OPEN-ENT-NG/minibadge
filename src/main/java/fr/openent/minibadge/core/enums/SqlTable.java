package fr.openent.minibadge.core.enums;

import fr.openent.minibadge.Minibadge;

public enum SqlTable {
    REL_BADGE_CATEGORY_BADGE_TYPE("rel_badge_category_badge_type"),
    BADGE_TYPE("badge_type"),
    BADGE_TYPE_SETTING("badge_type_setting"),
    BADGE_CATEGORY("badge_category"),
    BADGE("badge"),
    BADGE_PUBLIC("badge_public"),
    BADGE_ASSIGNABLE("badge_assignable"),
    BADGE_DISABLED("badge_disabled"),
    BADGE_ASSIGNED("badge_assigned"),
    BADGE_ASSIGNED_VALID("badge_assigned_valid"),
    BADGE_ASSIGNED_STRUCTURE("badge_assigned_structure"),
    USER("user");

    private final String tableName;

    SqlTable(String tableName) {
        this.tableName = String.format("%s.%s", Minibadge.dbSchema, tableName);
    }

    public String getName() {
        return tableName;
    }

    @Override
    public String toString() {
        return getName();
    }
}
