package fr.cgi.minibadge.model;

import fr.cgi.minibadge.core.constants.Field;
import fr.cgi.minibadge.core.constants.Request;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;

import java.util.ArrayList;
import java.util.List;


public class GlobalSettings implements Model<GlobalSettings> {

    private int pageSize;
    private List<ThresholdSetting> thresholdSettings = new ArrayList<>();

    public GlobalSettings(JsonObject globalSettings) {
        this.set(globalSettings);
    }

    public GlobalSettings setBadgeSettings(List<ThresholdSetting> thresholdSettings) {
        this.thresholdSettings = thresholdSettings;
        return this;
    }

    @Override
    public GlobalSettings set(JsonObject globalSettings) {
        this.pageSize = globalSettings.getInteger(Request.PAGESIZE);
        this.thresholdSettings = new ThresholdSetting().toList(
                globalSettings.getJsonArray(Field.THRESHOLDSETTINGS, new JsonArray())
        );
        return this;
    }

    @Override
    public JsonObject toJson() {
        return new JsonObject()
                .put(Request.PAGESIZE, this.pageSize)
                .put(Field.THRESHOLDSETTINGS, new ThresholdSetting().toArray(thresholdSettings));
    }

    @Override
    public GlobalSettings model(JsonObject globalSettings) {
        return new GlobalSettings(globalSettings);
    }


}