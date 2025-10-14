package fr.openent.minibadge.model;

import io.vertx.core.json.JsonObject;

import static fr.openent.minibadge.core.constants.Field.*;

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
                .put(MAXASSIGNABLE, maxAssignable)
                .put(PERIODASSIGNABLE, periodAssignable)
                .put(ASSIGNATIONSNUMBER, assignationsNumber)
                .put(STRUCTUREID, structureId);
    }

    @Override
    public ThresholdSetting model(JsonObject model) {
        return new ThresholdSetting(model);
    }

    @Override
    public ThresholdSetting set(JsonObject model) {
        this.maxAssignable = model.getInteger(MAXASSIGNABLE);
        this.periodAssignable = model.getString(PERIODASSIGNABLE);
        this.assignationsNumber = model.getInteger(ASSIGNATIONSNUMBER);
        this.structureId = model.getString(STRUCTUREID);
        return this;
    }
}
