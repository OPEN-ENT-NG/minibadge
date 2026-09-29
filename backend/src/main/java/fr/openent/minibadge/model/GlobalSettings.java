package fr.openent.minibadge.model;

import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.core.constants.Request;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;

import java.util.ArrayList;
import java.util.List;


public class GlobalSettings implements Model<GlobalSettings> {

    private int pageSize;
    /** Epic D: whether the PDF certificate can be generated (the button is hidden otherwise). */
    private boolean pdfExportEnabled;
    private List<ThresholdSetting> thresholdSettings = new ArrayList<>();

    public GlobalSettings(JsonObject globalSettings) {
        this.set(globalSettings);
    }

    public GlobalSettings setBadgeSettings(List<ThresholdSetting> thresholdSettings) {
        this.thresholdSettings = thresholdSettings;
        return this;
    }

    public GlobalSettings setPdfExportEnabled(boolean pdfExportEnabled) {
        this.pdfExportEnabled = pdfExportEnabled;
        return this;
    }

    public boolean pdfExportEnabled() {
        return pdfExportEnabled;
    }

    @Override
    public GlobalSettings set(JsonObject globalSettings) {
        this.pageSize = globalSettings.getInteger(Request.PAGESIZE);
        this.pdfExportEnabled = Boolean.TRUE.equals(globalSettings.getBoolean(Field.PDFEXPORTENABLED));
        this.thresholdSettings = new ThresholdSetting().toList(
                globalSettings.getJsonArray(Field.THRESHOLDSETTINGS, new JsonArray())
        );
        return this;
    }

    @Override
    public JsonObject toJson() {
        return new JsonObject()
                .put(Request.PAGESIZE, this.pageSize)
                .put(Field.THRESHOLDSETTINGS, new ThresholdSetting().toArray(thresholdSettings))
                .put(Field.PDFEXPORTENABLED, pdfExportEnabled);
    }

    @Override
    public GlobalSettings model(JsonObject globalSettings) {
        return new GlobalSettings(globalSettings);
    }


}