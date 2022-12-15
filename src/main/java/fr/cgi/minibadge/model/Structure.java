package fr.cgi.minibadge.model;

import fr.cgi.minibadge.core.constants.Database;
import fr.cgi.minibadge.core.constants.Field;
import io.vertx.core.json.JsonObject;

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
        this.id = model.getString(Field.ID, model.getString(Database.STRUCTURE_ID, model.getString(Database.STRUCTUREID)));
        this.name = model.getString(Field.NAME);
        this.countAssigned = model.getInteger(Field.COUNT_ASSIGNED);
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
                .put(Field.ID, this.id)
                .put(Field.NAME, this.name)
                .put(Field.COUNTASSIGNED, this.countAssigned);
    }
}
