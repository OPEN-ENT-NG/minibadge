package fr.openent.minibadge.model;

import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import static fr.openent.minibadge.core.constants.Field.*;


public class BadgeType implements Model<BadgeType> {

    private Long id;
    private String structureId;
    private String ownerId;
    private String pictureId;
    private String label;
    private String description;
    private String descriptionShort;
    private String createdAt;
    private User owner;
    private Integer countAssigned;
    private Integer countRefused;
    private List<User> mostAssigningUsers;
    private TypeSetting setting = new TypeSetting();
    private List<BadgeCategory> categories = new ArrayList<>();
    private Boolean isSelfAssigned = false;

    public BadgeType() {
    }

    public BadgeType(JsonObject badgeType) {
        this.set(badgeType);
    }

    @Override
    public BadgeType set(JsonObject badgeType) {
        this.id = badgeType.getLong(ID);
        this.structureId = badgeType.getString(STRUCTURE_ID, badgeType.getString(STRUCTUREID));
        this.ownerId = badgeType.getString(OWNER_ID, badgeType.getString(OWNERID));
        this.pictureId = badgeType.getString(PICTURE_ID, badgeType.getString(PICTUREID));
        this.label = badgeType.getString(LABEL);
        this.description = badgeType.getString(DESCRIPTION);
        this.descriptionShort = badgeType.getString(DESCRIPTION_SHORT, badgeType.getString(DESCRIPTIONSHORT));
        this.countAssigned = badgeType.getInteger(COUNT_ASSIGNED);
        this.countRefused = badgeType.getInteger(COUNT_REFUSED);
        this.mostAssigningUsers = new User().toList(badgeType.getJsonArray(MOST_ASSIGNING_USERS, new JsonArray()));
        this.createdAt = badgeType.getString(CREATED_AT, badgeType.getString(CREATEDAT));
        return this;
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

    public String descriptionShort() {
        return descriptionShort;
    }

    public void setDescriptionShort(String descriptionShort) {
        this.descriptionShort = descriptionShort;
    }

    public User owner() {
        return owner;
    }

    public void setOwner(User owner) {
        this.owner = owner;
    }

    public void setMostAssigningUsers(List<User> mostAssigningUsers) {
        this.mostAssigningUsers = mostAssigningUsers;
    }

    public TypeSetting getSetting() {
        return setting;
    }

    public void setSetting(TypeSetting setting) {
        this.setting = setting;
    }

    public void setCategories(List<BadgeCategory> categories) {
        this.categories = categories;
    }

    public List<BadgeCategory> categories() {
        return categories;
    }

    public Boolean isSelfAssigned() {
        return isSelfAssigned;
    }

    public void setSelfAssigned(Boolean selfAssigned) {
        isSelfAssigned = selfAssigned;
    }

    @Override
    public JsonObject toJson() {
        JsonObject badgeType = new JsonObject()
                .put(ID, this.id)
                .put(STRUCTUREID, this.structureId)
                .put(OWNERID, this.ownerId)
                .put(PICTUREID, this.pictureId)
                .put(LABEL, this.label)
                .put(CREATEDAT, this.createdAt)
                .put(DESCRIPTION, this.description)
                .put(DESCRIPTIONSHORT, this.descriptionShort)
                .put(COUNTASSIGNED, this.countAssigned)
                .put(COUNTREFUSED, this.countRefused)
                .put(SETTING, this.setting.toJson())
                .put(CATEGORIES, this.categories.stream().map(BadgeCategory::toJson).collect(Collectors.toList()))
                .put(ISSELFASSIGNED, this.isSelfAssigned);
        if (this.owner != null)
            badgeType.put(OWNER, this.owner.toJson());

        if (this.mostAssigningUsers != null)
            badgeType.put(MOSTASSIGNINGUSERS, new User().toArray(this.mostAssigningUsers));

        return badgeType;
    }

    @Override
    public BadgeType model(JsonObject badgeType) {
        return new BadgeType(badgeType);
    }
}