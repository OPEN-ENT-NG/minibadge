package fr.openent.minibadge.model;

import io.vertx.core.json.JsonObject;

import static fr.openent.minibadge.core.constants.Field.*;

/**
 * Raw row shape read from a {@code badge_type_setting} / {@code badge_protagonist_setting}
 * join: one {@code protagonist_type_id} (e.g. "Student", "Teacher") tagged with its
 * {@code protagonist_type} (SENDER_PROFILE / TARGET_PROFILE / SENDER_AUDIENCE / TARGET_AUDIENCE).
 * Internal to the repository/service layer — never serialized to the frontend (that's what
 * {@link BadgeProtagonistSetting} / {@link BadgeProtagonistSettingRelation} are for).
 */
public class BadgeProtagonistSettingRow implements Model<BadgeProtagonistSettingRow> {
    private Long id;
    private String protagonistTypeId;
    private String protagonistType;

    public BadgeProtagonistSettingRow() {
    }

    public BadgeProtagonistSettingRow(JsonObject row) {
        this.set(row);
    }

    public Long id() {
        return id;
    }

    public String protagonistTypeId() {
        return protagonistTypeId;
    }

    public String protagonistType() {
        return protagonistType;
    }

    @Override
    public JsonObject toJson() {
        return new JsonObject()
                .put(ID, id)
                .put(PROTAGONISTTYPEID, protagonistTypeId)
                .put(PROTAGONISTTYPE, protagonistType);
    }

    @Override
    public BadgeProtagonistSettingRow model(JsonObject model) {
        return new BadgeProtagonistSettingRow(model);
    }

    @Override
    public BadgeProtagonistSettingRow set(JsonObject model) {
        this.id = model.getLong(ID);
        this.protagonistTypeId = model.getString(PROTAGONIST_TYPE_ID);
        this.protagonistType = model.getString(PROTAGONIST_TYPE);
        return this;
    }
}
