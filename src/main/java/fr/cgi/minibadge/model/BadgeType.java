package fr.cgi.minibadge.model;

import fr.cgi.minibadge.core.constants.Database;
import fr.cgi.minibadge.core.constants.Field;
import io.vertx.core.json.JsonObject;


public class BadgeType implements Model<BadgeType> {

    private long id;
    private String structureId;
    private String ownerId;
    private String pictureId;
    private String label;
    private String description;

    public BadgeType() {}
    public BadgeType(JsonObject badgeType) {
        this.id = badgeType.getLong(Field.ID);
        this.structureId = badgeType.getString(Database.STRUCTUREID, badgeType.getString(Database.STRUCTURE_ID));
        this.ownerId = badgeType.getString(Field.OWNER_ID, badgeType.getString(Field.OWNERID));
        this.pictureId = badgeType.getString(Field.PICTURE_ID, badgeType.getString(Field.PICTURE_ID));
        this.label = badgeType.getString(Field.LABEL);
        this.description = badgeType.getString(Field.DESCRIPTION);
    }

    public long id() {
        return id;
    }

    public void setId(long id) {
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

    public String pictureId() {
        return pictureId;
    }

    public void setPictureId(String pictureId) {
        this.pictureId = pictureId;
    }

    public String label() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String description() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    @Override
    public JsonObject toJson() {
        return new JsonObject()
                .put(Field.ID, this.id)
                .put(Database.STRUCTUREID, this.structureId)
                .put(Field.OWNERID, this.ownerId)
                .put(Field.PICTUREID, this.pictureId)
                .put(Field.LABEL, this.label)
                .put(Field.DESCRIPTION, this.description);
    }

    @Override
    public BadgeType model(JsonObject badgeType) {
        return new BadgeType(badgeType);
    }
}