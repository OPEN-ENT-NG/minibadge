package fr.openent.minibadge.model;

import fr.openent.minibadge.core.constants.Database;
import fr.openent.minibadge.core.constants.Field;
import io.vertx.core.json.JsonObject;

public class ThresholdSetting implements Model<ThresholdSetting> {

    String structureId;
    Integer maxAssignable;
    String periodAssignable;
    Integer assignationsNumber;

    public ThresholdSetting() {
    }

    public ThresholdSetting(JsonObject thresholdSetting) {
        this.set(thresholdSetting);
    }

    public Integer thresholdMaxAssignable() {
        return maxAssignable;
    }

    public String thresholdPeriodAssignable() {
        return periodAssignable;
    }

    public Integer assignationsNumber() {
        return assignationsNumber;
    }

    public void setAssignationsNumber(Integer assignationsNumber) {
        this.assignationsNumber = assignationsNumber;
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
                .put(Field.MAXASSIGNABLE, maxAssignable)
                .put(Field.PERIODASSIGNABLE, periodAssignable)
                .put(Field.ASSIGNATIONSNUMBER, assignationsNumber)
                .put(Database.STRUCTUREID, structureId);
    }

    @Override
    public ThresholdSetting model(JsonObject model) {
        return new ThresholdSetting(model);
    }

    @Override
    public ThresholdSetting set(JsonObject model) {
        this.maxAssignable = model.getInteger(Field.MAXASSIGNABLE);
        this.periodAssignable = model.getString(Field.PERIODASSIGNABLE);
        this.assignationsNumber = model.getInteger(Field.ASSIGNATIONSNUMBER);
        this.structureId = model.getString(Database.STRUCTUREID);
        return this;
    }
}
