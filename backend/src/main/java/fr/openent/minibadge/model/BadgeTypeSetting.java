package fr.openent.minibadge.model;

import fr.openent.minibadge.helper.BadgeValidityHelper;
import io.vertx.core.json.JsonObject;

import static fr.openent.minibadge.core.constants.Field.*;

public class BadgeTypeSetting implements Model<BadgeTypeSetting> {
    private Long id;
    private String structureId;
    private String badgeTypeId;
    private Boolean isSelfAssignable;
    private String level;
    /** Epic C: end date of this badge type ({@code YYYY-MM-DD}), {@code null} when permanent. */
    private String validUntil;
    /**
     * Epic C: computed by SQL against the database's {@code CURRENT_DATE} (see
     * DefaultBadgeTypeSettingRepository), so no caller ever compares {@link #validUntil} with a clock of
     * its own. False when permanent, or when the row was not read with that column.
     */
    private boolean isExpired;

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
        this.validUntil = BadgeValidityHelper.format(BadgeValidityHelper.parseValidUntil(
                badgeTypeSetting.getString(VALID_UNTIL, badgeTypeSetting.getString(VALIDUNTIL))));
        this.isExpired = badgeTypeSetting.getBoolean(IS_EXPIRED, badgeTypeSetting.getBoolean(ISEXPIRED, false));
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

    public String getValidUntil() {
        return validUntil;
    }

    public BadgeTypeSetting setValidUntil(String validUntil) {
        this.validUntil = validUntil;
        return this;
    }

    public boolean getIsExpired() {
        return isExpired;
    }

    public BadgeTypeSetting setIsExpired(boolean isExpired) {
        this.isExpired = isExpired;
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
        json.put(VALIDUNTIL, this.validUntil);
        json.put(ISEXPIRED, this.isExpired);
        return json;
    }
}
