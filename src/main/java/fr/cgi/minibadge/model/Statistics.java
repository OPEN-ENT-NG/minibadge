package fr.cgi.minibadge.model;

import fr.cgi.minibadge.core.constants.Field;
import io.vertx.core.json.JsonObject;


public class Statistics implements Model<Statistics> {

    private Integer countBadgeAssigned;

    public Statistics() {
    }

    public Statistics(JsonObject statistics) {
        this.set(statistics);
    }

    public void setCountBadgeAssigned(JsonObject requestResult) {
        this.countBadgeAssigned = requestResult.getInteger(Field.COUNT);
    }

    @Override
    public Statistics set(JsonObject statistics) {
        this.countBadgeAssigned = statistics.getInteger(Field.COUNT_BADGE_ASSIGNED);
        return this;
    }

    @Override
    public JsonObject toJson() {
        return new JsonObject()
                .put(Field.COUNTBADGEASSIGNED, countBadgeAssigned);
    }

    @Override
    public Statistics model(JsonObject model) {
        return new Statistics(model);
    }
}