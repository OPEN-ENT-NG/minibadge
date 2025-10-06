package fr.openent.minibadge.core.constants;

import fr.openent.minibadge.Minibadge;

public class Database {
    public static final String BADGE = "badge";
    public static final String BADGE_PUBLIC = "badge_public";
    public static final String BADGE_ASSIGNABLE = "badge_assignable";
    public static final String BADGE_DISABLED = "badge_disabled";
    public static final String BADGE_ASSIGNED = "badge_assigned";
    public static final String BADGE_ASSIGNED_VALID = "badge_assigned_valid";
    public static final String BADGE_ASSIGNED_STRUCTURE = "badge_assigned_structure";
    public static final String BADGE_TYPE = "badge_type";
    public static final String CATEGORYID = "categoryId";
    public static final String STRUCTUREID = "structureId";
    public static final String STRUCTURE_ID = "structure_id";
    public static final String TYPEID = "typeId";
    public static final String PRIVATIZED_AT = "privatized_at";
    public static final String REFUSED_AT = "refused_at";
    public static final String REL_BADGE_CATEGORY_BADGE_TYPE = "rel_badge_category_badge_type";
    public static final String NOW_SQL_FUNCTION = "now()";
    public static final String NULL = "null";
    public static final String USER = "user";

    /*
    Table names
     */

    public static final String REL_BADGE_CATEGORY_BADGE_TYPE_TABLE = String.format("%s.%s", Minibadge.dbSchema, REL_BADGE_CATEGORY_BADGE_TYPE);
    public static final String BADGE_TYPE_TABLE = String.format("%s.%s", Minibadge.dbSchema, BADGE_TYPE);
    public static final String BADGE_TABLE = String.format("%s.%s", Minibadge.dbSchema, BADGE);
    public static final String BADGE_PUBLIC_TABLE = String.format("%s.%s", Minibadge.dbSchema, BADGE_PUBLIC);
    public static final String BADGE_ASSIGNABLE_TABLE = String.format("%s.%s", Minibadge.dbSchema, BADGE_ASSIGNABLE);
    public static final String BADGE_DISABLED_TABLE = String.format("%s.%s", Minibadge.dbSchema, BADGE_DISABLED);
    public static final String BADGE_ASSIGNED_TABLE = String.format("%s.%s", Minibadge.dbSchema, BADGE_ASSIGNED);
    public static final String BADGE_ASSIGNED_VALID_TABLE = String.format("%s.%s", Minibadge.dbSchema, BADGE_ASSIGNED_VALID);
    public static final String BADGE_ASSIGNED_STRUCTURE_TABLE = String.format("%s.%s", Minibadge.dbSchema, BADGE_ASSIGNED_STRUCTURE);
    public static final String USER_TABLE = String.format("%s.%s", Minibadge.dbSchema, USER);

    /*
    Preferences
     */
    public static final String MINIBADGECHART = "minibadgechart";
    public static final String BADGEID = "badgeId";

    private Database() {
        throw new IllegalStateException("Utility class");
    }
}

