package fr.openent.minibadge.model;

import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;

import java.util.ArrayList;
import java.util.List;

import static fr.openent.minibadge.core.constants.Field.*;

public class TypeSetting implements Model<TypeSetting> {
    //A changer des que la bdd sera opérationnelle
    List<BadgeProtagonistSettingRelation> relations = new ArrayList<>();
    boolean isSelfAssignable;
    String structureId;

    public TypeSetting() {
        //A changer des que la bdd sera opérationnelle
    }

    public TypeSetting(JsonObject typeSetting) {
        this.set(typeSetting);
    }

    public TypeSetting(List<BadgeProtagonistSettingRelation> relations) {
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

    public TypeSetting setSelfAssignable(boolean selfAssignable) {
        isSelfAssignable = selfAssignable;
        return this;
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
                .put(RELATIONS, new BadgeProtagonistSettingRelation().toArray(relations))
                .put(ISSELFASSIGNABLE, isSelfAssignable)
                .put(STRUCTUREID, structureId);
    }

    @Override
    public TypeSetting model(JsonObject model) {
        return new TypeSetting(model);
    }

    public TypeSetting set(TypeSetting model) {
        this.relations = model.relations();
        this.isSelfAssignable = model.isSelfAssignable();
        this.structureId = model.structureId();
        return this;
    }

    @Override
    public TypeSetting set(JsonObject model) {
        this.isSelfAssignable = model.getBoolean(ISSELFASSIGNABLE, false);
        this.structureId = model.getString(STRUCTUREID);
        this.relations = new BadgeProtagonistSettingRelation()
                .toList(model.getJsonArray(RELATIONS, new JsonArray()));
        return this;
    }
}
