package fr.openent.minibadge.model;

import io.vertx.core.json.JsonObject;

import static fr.openent.minibadge.core.constants.Field.*;

public class Structure implements Model<Structure> {
    private String id;
    private String name;
    private Integer countAssigned;


    public Structure() {
    }

    public Structure(JsonObject structure) {
        this.set(structure);
    }

    @Override
    public Structure model(JsonObject structure) {
        return new Structure(structure);
    }

    @Override
    public Structure set(JsonObject model) {
        this.id = model.getString(ID, model.getString(STRUCTURE_ID, model.getString(STRUCTUREID)));
        this.name = model.getString(NAME);
        this.countAssigned = model.getInteger(COUNT_ASSIGNED);
        return this;
    }

    public Integer countAssigned() {
        return this.countAssigned;
    }

    public void setCountAssigned(Integer countAssigned) {
        this.countAssigned = countAssigned;
    }

    public String id() {
        return id;
    }

    @Override
    public JsonObject toJson() {
        return new JsonObject()
                .put(ID, this.id)
                .put(NAME, this.name)
                .put(COUNTASSIGNED, this.countAssigned);
    }
}
