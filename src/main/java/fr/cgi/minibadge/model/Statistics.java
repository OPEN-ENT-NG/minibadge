package fr.cgi.minibadge.model;

import fr.cgi.minibadge.core.constants.Field;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;

import java.util.List;


public class Statistics implements Model<Statistics> {

    private Integer countBadgeAssigned;
    private List<BadgeType> mostAssignedTypes;

    public Statistics() {
    }

    public Statistics(JsonObject statistics) {
        this.set(statistics);
    }

    public void setCountBadgeAssigned(JsonObject requestResult) {
        this.countBadgeAssigned = requestResult.getInteger(Field.COUNT);
    }

    public void setMostAssignedTypes(JsonArray requestResults) {
        this.mostAssignedTypes = new BadgeType().toList(requestResults);
    }

    @Override
    public Statistics set(JsonObject statistics) {
        return this;
    }

    @Override
    public JsonObject toJson() {
        return new JsonObject()
                .put(Field.COUNTBADGEASSIGNED, countBadgeAssigned)
                .put(Field.MOSTASSIGNEDTYPES, new BadgeType().toArray(mostAssignedTypes));
    }

    @Override
    public Statistics model(JsonObject model) {
        return new Statistics(model);
    }
}