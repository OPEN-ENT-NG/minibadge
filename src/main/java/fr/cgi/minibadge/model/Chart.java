package fr.cgi.minibadge.model;

import fr.cgi.minibadge.core.constants.Field;
import io.vertx.core.json.JsonObject;


public class Chart implements Model<Chart> {
    private String acceptChart;
    private String acceptAssign;
    private String acceptReceive;

    public Chart() {
    }

    public Chart(JsonObject chart) {
        this.set(chart);
    }

    @Override
    public Chart set(JsonObject chart) {
        JsonObject permissions = new JsonObject(chart.getString(Field.PERMISSIONS, "{}"));
        this.acceptChart = permissions.getString(Field.ACCEPTCHART, chart.getString(Field.ACCEPTCHART)) ;
        this.acceptAssign = permissions.getString(Field.ACCEPTASSIGN, chart.getString(Field.ACCEPTASSIGN)) ;
        this.acceptReceive = permissions.getString(Field.ACCEPTRECEIVE, chart.getString(Field.ACCEPTRECEIVE));
        return this;
    }

    @Override
    public JsonObject toJson() {
        return new JsonObject()
                .put(Field.ACCEPTCHART, this.acceptChart)
                .put(Field.ACCEPTASSIGN, this.acceptAssign)
                .put(Field.ACCEPTRECEIVE, this.acceptReceive);
    }

    @Override
    public Chart model(JsonObject chart) {
        return new Chart(chart);
    }

    public String acceptChart() {
        return acceptChart;
    }

    public String acceptAssign() {
        return acceptAssign;
    }

    public String acceptReceive() {
        return acceptReceive;
    }
}