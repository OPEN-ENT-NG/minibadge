package fr.cgi.minibadge.model;

import fr.cgi.minibadge.core.constants.Database;
import fr.cgi.minibadge.core.constants.Field;
import io.vertx.core.json.JsonObject;

public class BadgeAssignedStructure implements Model<BadgeAssignedStructure> {
    private Long id;
    private Long badgeAssignedId;
    private String structureId;
    private Boolean isStructureAssigner;
    private Boolean isStructureReceiver;

    public BadgeAssignedStructure() {
    }

    public BadgeAssignedStructure(Long badgeAssignedId,
                                  String structureId,
                                  Boolean isStructureAssigner,
                                  Boolean isStructureReceiver) {
        this.badgeAssignedId = badgeAssignedId;
        this.structureId = structureId;
        this.isStructureAssigner = isStructureAssigner;
        this.isStructureReceiver = isStructureReceiver;
    }

    public BadgeAssignedStructure(JsonObject badgeAssignedStructure) {
        this.set(badgeAssignedStructure);
    }

    @Override
    public BadgeAssignedStructure model(JsonObject badgeAssignedStructure) {
        return new BadgeAssignedStructure(badgeAssignedStructure);
    }

    @Override
    public BadgeAssignedStructure set(JsonObject badgeAssignedStructure) {
        this.id = badgeAssignedStructure.getLong(Field.ID);
        this.badgeAssignedId = badgeAssignedStructure.getLong(Field.BADGE_ASSIGNED_ID);
        this.structureId = badgeAssignedStructure.getString(Database.STRUCTURE_ID);
        this.isStructureAssigner = badgeAssignedStructure.getBoolean(Field.IS_STRUCTURE_ASSIGNER);
        this.isStructureReceiver = badgeAssignedStructure.getBoolean(Field.IS_STRUCTURE_RECEIVER);
        return this;
    }

    public Long id() {
        return id;
    }

    public Long badgeAssignedId() {
        return badgeAssignedId;
    }

    public String structureId() {
        return structureId;
    }

    public Boolean structureAssigner() {
        return isStructureAssigner;
    }

    public Boolean structureReceiver() {
        return isStructureReceiver;
    }

    @Override
    public JsonObject toJson() {
        return new JsonObject()
                .put(Field.ID, this.id)
                .put(Field.ASSIGNORID, this.badgeAssignedId)
                .put(Field.CREATEDAT, this.structureId)
                .put(Field.UPDATEDAT, this.isStructureAssigner)
                .put(Field.REVOKEDAT, this.isStructureReceiver);
    }
}
