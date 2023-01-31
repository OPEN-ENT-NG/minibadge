package fr.openent.minibadge.model;

import fr.openent.minibadge.core.constants.Database;
import fr.openent.minibadge.core.constants.Field;
import io.vertx.core.json.JsonObject;


public class Badge implements Model<Badge> {

    private Long id;
    private String structureId;
    private String ownerId;
    private Long typeId;
    private String privatizedAt;
    private String refusedAt;
    private String disabledAt;
    private User owner;
    private BadgeCounts badgeCounts;

    public BadgeType badgeType() {
        return badgeType;
    }

    private BadgeType badgeType;

    public Badge() {
    }

    public Badge(JsonObject badge) {
        this.set(badge);
    }

    @Override
    public Badge set(JsonObject badge) {
        this.id = badge.getLong(Field.ID);
        this.typeId = badge.getLong(Field.BADGE_TYPE_ID, badge.getLong(Field.BADGETYPEID));
        this.ownerId = badge.getString(Field.OWNER_ID, badge.getString(Field.OWNERID));
        this.privatizedAt = badge.getString(Field.PRIVATIZED_AT, badge.getString(Field.PRIVATIZEDAT));
        this.refusedAt = badge.getString(Field.REFUSED_AT, badge.getString(Field.REFUSEDAT));
        this.disabledAt = badge.getString(Field.DISABLED_AT, badge.getString(Field.DISABLEDAT));
        this.badgeCounts = new BadgeCounts(badge);
        this.badgeType = setBadgeType(badge.getString(Field.BADGE_TYPE_LABEL),
                badge.getString(Field.BADGE_TYPE_PICTURE_ID));
        this.owner = setOwner(badge.getString(Field.OWNER_ID,badge.getString(Field.OWNERID)),
                       badge.getString(Field.DISPLAYNAME, badge.getString(Field.DISPLAY_NAME)));
        return this;
    }

    private User setOwner(String ownerId, String displayName) {
        return new User(new JsonObject().put(Field.ID,ownerId).put(Field.USERNAME,displayName));
    }

    public BadgeType setBadgeType(String typeLabel, String pictureId) {
        return new BadgeType(
                new JsonObject()
                        .put(Field.ID, this.typeId)
                        .put(Field.LABEL, typeLabel)
                        .put(Field.PICTUREID, pictureId)
        );
    }

    public Long id() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String structureId() {
        return structureId;
    }

    public void setStructureId(String structureId) {
        this.structureId = structureId;
    }

    public String ownerId() {
        return ownerId;
    }

    public void setOwnerId(String ownerId) {
        this.ownerId = ownerId;
    }

    public User owner() {
        return owner;
    }

    public void setOwner(User owner) {
        this.owner = owner;
    }

    @Override
    public JsonObject toJson() {
        JsonObject badge = new JsonObject()
                .put(Field.ID, this.id)
                .put(Database.STRUCTUREID, this.structureId)
                .put(Field.BADGETYPEID, this.typeId)
                .put(Field.OWNERID, this.ownerId)
                .put(Field.PRIVATIZEDAT, this.privatizedAt)
                .put(Field.REFUSEDAT, this.refusedAt)
                .put(Field.DISABLEDAT, this.disabledAt)
                .put(Field.COUNTS, this.badgeCounts.toJson())
                .put(Field.BADGETYPE, this.badgeType.toJson());

        if (this.owner != null)
            badge.put(Field.OWNER, this.owner.toJson());

        return badge;
    }

    @Override
    public Badge model(JsonObject badge) {
        return new Badge(badge);
    }


    private static class BadgeCounts implements Model<BadgeCounts> {
        private Integer assigned;

        public BadgeCounts(JsonObject badgeCount) {
            this.set(badgeCount);
        }

        @Override
        public JsonObject toJson() {
            return new JsonObject()
                    .put(Field.ASSIGNED, this.assigned);
        }

        @Override
        public BadgeCounts model(JsonObject badgeCounts) {
            return new BadgeCounts(badgeCounts);
        }

        @Override
        public BadgeCounts set(JsonObject badgeCounts) {
            this.assigned = badgeCounts.getInteger(Field.COUNT_ASSIGNED);
            return this;
        }
    }
}