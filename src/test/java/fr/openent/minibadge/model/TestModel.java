package fr.openent.minibadge.model;

import fr.openent.minibadge.core.constants.Field;
import io.vertx.core.json.JsonObject;

public class TestModel implements Model<TestModel> {
    private Long id;

    public TestModel() {
    }

    public TestModel(JsonObject testModel) {
        this.set(testModel);
    }

    public Long id() {
        return id;
    }


    @Override
    public TestModel model(JsonObject model) {
        return new TestModel(model);
    }

    @Override
    public TestModel set(JsonObject model) {
        this.id = model.getLong(Field.ID);
        return this;
    }


    @Override
    public JsonObject toJson() {
        return new JsonObject()
                .put(Field.ID, this.id);
    }
}
