package fr.cgi.minibadge.model;

import fr.cgi.minibadge.core.constants.Database;
import fr.cgi.minibadge.core.constants.Field;
import io.vertx.core.json.JsonObject;

public class BadgeAssigned implements Model<BadgeAssigned>{
    private Long id;
    private User assignor;
    private String assignorId;
    private String createdAt;
    private String updatedAt;
    private String revokedAt;
    private String acceptedAt;
    private Badge badge;

    public BadgeAssigned() {
    }

    public BadgeAssigned(JsonObject badgeAssigned) {
        this.set(badgeAssigned);
    }


    public Badge setBadge(Long idBadge, Long idBadgeType, String typeLabel, String pictureId, String ownerId, String displayName) {
        return new Badge(
                new JsonObject()
                        .put(Field.ID, idBadge)
                        .put(Field.BADGE_TYPE_ID,idBadgeType)
                        .put(Field.BADGE_TYPE_LABEL, typeLabel)
                        .put(Field.BADGE_TYPE_PICTURE_ID, pictureId)
                        .put(Field.OWNER_ID,ownerId)
                .put(Field.DISPLAYNAME,displayName)
        );
    }
    @Override
    public BadgeAssigned model(JsonObject badgeAssigned) {
        return new BadgeAssigned(badgeAssigned);
    }

    @Override
    public BadgeAssigned set(JsonObject badgeAssigned) {
        this.id = badgeAssigned.getLong(Field.ID);
        this.assignorId = badgeAssigned.getString(Field.ASSIGNORID, badgeAssigned.getString(Field.ASSIGNOR_ID));
        this.createdAt = badgeAssigned.getString(Field.CREATED_AT, badgeAssigned.getString(Field.CREATEDAT));
        this.updatedAt = badgeAssigned.getString(Field.UPDATED_AT, badgeAssigned.getString(Field.UPDATEDAT));
        this.acceptedAt = badgeAssigned.getString(Field.ACCEPTED_AT, badgeAssigned.getString(Field.ACCEPTEDAT));
        this.revokedAt = badgeAssigned.getString(Field.REVOKED_AT, badgeAssigned.getString(Field.REVOKEDAT));
        this.badge = setBadge(
                badgeAssigned.getLong(Field.BADGE_ID,badgeAssigned.getLong(Field.BADGEID)) ,
                badgeAssigned.getLong(Field.BADGE_TYPE_ID,badgeAssigned.getLong(Field.BADGETYPEID)),
                badgeAssigned.getString(Field.LABEL),
                badgeAssigned.getString(Field.PICTURE_ID,badgeAssigned.getString(Field.PICTUREID)),
                badgeAssigned.getString(Field.OWNER_ID,badgeAssigned.getString(Field.OWNERID)),
                badgeAssigned.getString(Field.DISPLAYNAME, badgeAssigned.getString(Field.DISPLAY_NAME))
                );

        return this;
    }

    public Long id() {
        return id;
    }

    public User getAssignor() {
        return assignor;
    }

    public void setAssignor(User assignor) {
        this.assignor = assignor;
    }

    public String createdAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String updatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String revokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(String revokedAt) {
        this.revokedAt = revokedAt;
    }

    public String acceptedAt() {
        return acceptedAt;
    }

    public void setAcceptedAt(String acceptedAt) {
        this.acceptedAt = acceptedAt;
    }

    public Badge badge() {
        return badge;
    }

    public void setBadge(Badge badge) {
        this.badge = badge;
    }
    public String assignorId() {
        return assignorId;
    }

    public void setAssignorId(String assignorId) {
        this.assignorId = assignorId;
    }


    @Override
    public JsonObject toJson() {
        JsonObject badgeAssigned = new JsonObject()
                .put(Field.ID, this.id)
                .put(Field.ASSIGNORID, this.assignorId)
                .put(Field.CREATEDAT, this.createdAt)
                .put(Field.UPDATEDAT, this.updatedAt)
                .put(Field.REVOKEDAT, this.revokedAt)
                .put(Field.ACCEPTEDAT, this.acceptedAt)
                .put(Field.BADGE, this.badge.toJson());

        if (this.assignor != null)
            badgeAssigned.put(Field.ASSIGNOR, this.assignor.toJson());


        return badgeAssigned;
    }


}
