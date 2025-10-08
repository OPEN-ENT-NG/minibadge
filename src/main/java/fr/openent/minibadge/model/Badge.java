package fr.openent.minibadge.model;

import io.vertx.core.json.JsonObject;

import static fr.openent.minibadge.core.constants.Field.*;


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
        this.id = badge.getLong(ID);
        this.typeId = badge.getLong(BADGE_TYPE_ID, badge.getLong(BADGETYPEID));
        this.ownerId = badge.getString(OWNER_ID, badge.getString(OWNERID));
        this.privatizedAt = badge.getString(PRIVATIZED_AT, badge.getString(PRIVATIZEDAT));
        this.refusedAt = badge.getString(REFUSED_AT, badge.getString(REFUSEDAT));
        this.disabledAt = badge.getString(DISABLED_AT, badge.getString(DISABLEDAT));
        this.badgeCounts = new BadgeCounts(badge);
        this.badgeType = setBadgeType(badge.getString(BADGE_TYPE_LABEL),
                badge.getString(BADGE_TYPE_PICTURE_ID));
        this.owner = setOwner(badge.getString(OWNER_ID,badge.getString(OWNERID)),
                       badge.getString(DISPLAYNAME, badge.getString(DISPLAY_NAME)));
        return this;
    }

    private User setOwner(String ownerId, String displayName) {
        return new User(new JsonObject().put(ID,ownerId).put(USERNAME,displayName));
    }

    public BadgeType setBadgeType(String typeLabel, String pictureId) {
        return new BadgeType(
                new JsonObject()
                        .put(ID, this.typeId)
                        .put(LABEL, typeLabel)
                        .put(PICTUREID, pictureId)
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
                .put(ID, this.id)
                .put(STRUCTUREID, this.structureId)
                .put(BADGETYPEID, this.typeId)
                .put(OWNERID, this.ownerId)
                .put(PRIVATIZEDAT, this.privatizedAt)
                .put(REFUSEDAT, this.refusedAt)
                .put(DISABLEDAT, this.disabledAt)
                .put(COUNTS, this.badgeCounts.toJson())
                .put(BADGETYPE, this.badgeType.toJson());

        if (this.owner != null)
            badge.put(OWNER, this.owner.toJson());

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
                    .put(ASSIGNED, this.assigned);
        }

        @Override
        public BadgeCounts model(JsonObject badgeCounts) {
            return new BadgeCounts(badgeCounts);
        }

        @Override
        public BadgeCounts set(JsonObject badgeCounts) {
            this.assigned = badgeCounts.getInteger(COUNT_ASSIGNED);
            return this;
        }
    }
}