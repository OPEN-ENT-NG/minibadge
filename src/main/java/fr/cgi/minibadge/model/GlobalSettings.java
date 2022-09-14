package fr.cgi.minibadge.model;

import fr.cgi.minibadge.core.constants.Request;
import io.vertx.core.json.JsonObject;


public class GlobalSettings implements Model<GlobalSettings> {

    private int pageSize;

    public GlobalSettings(JsonObject globalSettings) {
        this.set(globalSettings);
    }

    @Override
    public GlobalSettings set(JsonObject globalSettings) {
        this.pageSize = globalSettings.getInteger(Request.PAGESIZE);
        return this;
    }

    @Override
    public JsonObject toJson() {
        return new JsonObject()
                .put(Request.PAGESIZE, this.pageSize);
    }

    @Override
    public GlobalSettings model(JsonObject globalSettings) {
        return new GlobalSettings(globalSettings);
    }


}