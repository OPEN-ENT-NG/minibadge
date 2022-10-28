package fr.cgi.minibadge.model;

import fr.cgi.minibadge.core.constants.Field;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;

import java.util.ArrayList;
import java.util.List;

import static fr.cgi.minibadge.core.constants.Database.STRUCTUREID;

public class BadgeSetting implements Model<BadgeSetting> {
    //A changer des que la bdd sera opérationnelle
    List<BadgeProtagonistSettingRelation> relations = new ArrayList<>();
    boolean isSelfAssignable;
    String structureId;

    public BadgeSetting() {
        //A changer des que la bdd sera opérationnelle
    }

    public BadgeSetting(JsonObject badgeSetting) {
        this.set(badgeSetting);
    }

    public BadgeSetting(List<BadgeProtagonistSettingRelation> relations) {
        this.setRelations(relations);
    }

    public List<BadgeProtagonistSettingRelation> relations() {
        return relations;
    }

    public void setRelations(List<BadgeProtagonistSettingRelation> relations) {
        this.relations = relations;
    }

    public void addRelation(BadgeProtagonistSettingRelation relation) {
        this.relations.add(relation);
    }

    public boolean isSelfAssignable() {
        return isSelfAssignable;
    }

    public String structureId() {
        return structureId;
    }

    public void setStructureId(String structureId) {
        this.structureId = structureId;
    }

    @Override
    public JsonObject toJson() {
        return new JsonObject()
                .put(Field.RELATIONS, new BadgeProtagonistSettingRelation().toArray(relations))
                .put(Field.ISSELFASSIGNABLE, isSelfAssignable)
                .put(STRUCTUREID, structureId);
    }

    @Override
    public BadgeSetting model(JsonObject model) {
        return new BadgeSetting(model);
    }

    public BadgeSetting set(BadgeSetting model) {
        this.relations = model.relations();
        this.isSelfAssignable = model.isSelfAssignable();
        this.structureId = model.structureId();
        return this;
    }

    @Override
    public BadgeSetting set(JsonObject model) {
        this.isSelfAssignable = model.getBoolean(Field.ISSELFASSIGNABLE, false);
        this.structureId = model.getString(STRUCTUREID);
        this.relations = new BadgeProtagonistSettingRelation()
                .toList(model.getJsonArray(Field.RELATIONS, new JsonArray()));
        return this;
    }
}
