package fr.openent.minibadge.model;

import io.vertx.core.json.JsonObject;

import static fr.openent.minibadge.core.constants.Field.*;

public class BadgeTypeSetting implements Model<BadgeTypeSetting> {
    private Long id;
    private String structureId;
    private String badgeTypeId;
    private Boolean isSelfAssignable;
    private String level;

    public BadgeTypeSetting(JsonObject badgeTypeSetting) {
        set(badgeTypeSetting);
    }

    @Override
    public BadgeTypeSetting model(JsonObject badgeTypeSetting) {
        return new BadgeTypeSetting(badgeTypeSetting);
    }

    @Override
    public BadgeTypeSetting set(JsonObject badgeTypeSetting) {
        this.id = badgeTypeSetting.getLong(ID, 0L);
        this.structureId = badgeTypeSetting.getString(STRUCTURE_ID, "");
        this.badgeTypeId = badgeTypeSetting.getString(BADGE_TYPE_ID, "");
        this.isSelfAssignable = badgeTypeSetting.getBoolean(IS_SELF_ASSIGNABLE, false);
        this.level = badgeTypeSetting.getString(LEVEL, "");
        return this;
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public BadgeTypeSetting setId(Long id) {
        this.id = id;
        return this;
    }

    public String getStructureId() {
        return structureId;
    }

    public BadgeTypeSetting setStructureId(String structureId) {
        this.structureId = structureId;
        return this;
    }

    public String getBadgeTypeId() {
        return badgeTypeId;
    }

    public BadgeTypeSetting setBadgeTypeId(String badgeTypeId) {
        this.badgeTypeId = badgeTypeId;
        return this;
    }

    public Boolean getIsSelfAssignable() {
        return isSelfAssignable;
    }

    public BadgeTypeSetting setIsSelfAssignable(Boolean isSelfAssignable) {
        this.isSelfAssignable = isSelfAssignable;
        return this;
    }

    public String getLevel() {
        return level;
    }

    public BadgeTypeSetting setLevel(String level) {
        this.level = level;
        return this;
    }

    @Override
    public JsonObject toJson() {
        JsonObject json = new JsonObject();
        json.put(ID, this.id);
        json.put(STRUCTUREID, this.structureId);
        json.put(BADGETYPEID, this.badgeTypeId);
        json.put(ISSELFASSIGNABLE, this.isSelfAssignable);
        json.put(LEVEL, this.level);
        return json;
    }
}
