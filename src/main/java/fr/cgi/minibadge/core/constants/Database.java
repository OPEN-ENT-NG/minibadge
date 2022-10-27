package fr.cgi.minibadge.core.constants;

public class Database {
    public static final String BADGE = "badge";
    public static final String BADGE_PUBLIC = "badge_public";
    public static final String BADGE_ASSIGNABLE = "badge_assignable";
    public static final String BADGE_ASSIGNED = "badge_assigned";
    public static final String BADGE_ASSIGNED_VALID = "badge_assigned_valid";
    public static final String BADGE_TYPE = "badge_type";
    public static final String LABEL = "label";
    public static final String STRUCTUREID = "structureId";
    public static final String STRUCTURE_ID = "structure_id";
    public static final String TYPEID = "typeId";
    public static final String PRIVATIZED_AT = "privatized_at";
    public static final String REFUSED_AT = "refused_at";
    public static final String NOW_SQL_FUNCTION = "now()";
    public static final String NULL = "null";
    public static final String USER = "user";


    /*
    Preferences
     */
    public static final String MINIBADGECHART = "minibadgechart";
    public static final String BADGEID = "badgeId";

    private Database() {
        throw new IllegalStateException("Utility class");
    }
}

