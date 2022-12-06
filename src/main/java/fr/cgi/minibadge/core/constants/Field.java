package fr.cgi.minibadge.core.constants;

public class Field {
    public static final String ID = "id";
    public static final String ASSIGNED = "assigned";
    public static final String COUNTS = "counts";
    public static final String OWNER = "owner";
    public static final String OWNERID = "ownerId";
    public static final String OWNERIDS = "ownerIds";
    public static final String OWNER_ID = "owner_id";
    public static final String BADGETYPE = "badgeType";
    public static final String BADGE_TYPE_ID = "badge_type_id";
    public static final String BADGETYPEID = "badgeTypeId";
    public static final String BADGE_TYPE_LABEL = "badge_type_label";
    public static final String BADGE_TYPE_PICTURE_ID = "badge_type_picture_id";
    public static final String PICTUREID = "pictureId";
    public static final String PICTURE_ID = "picture_id";
    public static final String LABEL = "label";
    public static final String DESCRIPTION = "description";
    public static final String CREATEDAT = "createdAt";
    public static final String CREATED_AT = "created_at";
    public static final String DISPLAYNAME = "displayName";
    public static final String DISPLAY_NAME = "display_name";
    public static final String FIRSTNAME = "firstName";
    public static final String LASTNAME = "lastName";
    public static final String USERNAME = "username";
    public static final String IDUSERS = "idUsers";
    public static final String COUNT = "count";
    public static final String Q = "q";
    public static final String FIELDS = "fields";
    public static final String PROFILE = "profile";
    public static final String STRUCTUREIDS = "structureIds";
    public static final String VALUE = "value";


    //BadgeAssigned
    public static final String BADGE_ASSIGNED_ID = "badge_assigned_id";

    public static final String ASSIGNOR = "assignor";
    public static final String ASSIGNOR_ID = "assignor_id";
    public static final String ASSIGNORID = "assignorId";
    public static final String REVOKEDAT = "revokedAt";
    public static final String REVOKED_AT = "revoked_at";
    public static final String ACCEPTEDAT = "acceptedAt";
    public static final String ACCEPTED_AT = "accepted_at";
    public static final String UPDATEDAT = "updatedAt";
    public static final String UPDATED_AT = "updated_at";
    public static final String BADGE_ID = "badge_id";
    public static final String BADGEID = "badgeId";
    public static final String BADGE = "badge";

    //BadgeAssignedStructure
    public static final String IS_STRUCTURE_ASSIGNER = "is_structure_assigner";
    public static final String IS_STRUCTURE_RECEIVER = "is_structure_receiver";


    //BADGE
    public static final String PRIVATIZED_AT = "privatized_at";
    public static final String PRIVATIZEDAT = "privatizedAt";
    public static final String REFUSED_AT = "refused_at";
    public static final String REFUSEDAT = "refusedAt";
    public static final String DISABLED_AT = "disabled_at";
    public static final String DISABLEDAT = "disabledAt";
    public static final String LEVEL = "level";
    public static final String ASSIGNABLEBY = "assignableBy";

    // CHART
    public static final String ACCEPTCHART = "acceptChart";
    public static final String ACCEPTASSIGN = "acceptAssign";
    public static final String ACCEPTRECEIVE = "acceptReceive";
    public static final String PERMISSIONS = "permissions";

    //USER
    public static final String USERIDS = "userIds";
    public static final String BADGE_ASSIGNED_TOTAL = "badge_assigned_total";
    public static final String BADGEASSIGNEDTOTAL = "badgeAssignedTotal";
    public static final String TYPE = "type";

    //Protagonist
    public static final String TYPEVALUE = "typeValue";
    public static final String ISSELFASSIGNABLE = "isSelfAssignable";
    public static final String ASSIGNORTYPE = "assignorType";
    public static final String RECEIVERTYPE = "receiverType";
    public static final String SETTINGS = "settings";
    public static final String SETTING = "setting";
    public static final String RELATIONS = "relations";

    // Badge Setting
    public static final String MAXASSIGNABLE = "maxAssignable";
    public static final String PERIODASSIGNABLE = "periodAssignable";
    public static final String ARE_THRESHOLDS_REACHED = "are_thresholds_reached";
    public static final String THRESHOLDSETTINGS = "thresholdSettings";
    public static final String ASSIGNATIONSNUMBER = "assignationsNumber";

    // Statistics
    public static final String STATISTICS = "statistics";
    public static final String COUNT_ASSIGNED = "count_assigned";
    public static final String COUNTASSIGNED = "countAssigned";
    public static final String COUNT_BADGE_ASSIGNED = "count_badge_assigned";
    public static final String COUNTBADGEASSIGNED = "countBadgeAssigned";
    public static final String MOSTASSIGNEDTYPES = "mostAssignedTypes";

    //CONFIG
    public static final String MOST_ASSIGNED_TYPE_LIST_SIZE = "most_assigned_type_list_size";

    private Field() {
        throw new IllegalStateException("Utility class");
    }
}

