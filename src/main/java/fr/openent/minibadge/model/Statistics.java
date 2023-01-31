package fr.openent.minibadge.model;

import fr.openent.minibadge.core.constants.Field;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;

import java.util.ArrayList;
import java.util.List;


public class Statistics implements Model<Statistics> {

    private Integer countBadgeAssigned;
    private List<BadgeType> mostAssignedTypes;
    private List<BadgeType> lessAssignedTypes;
    private List<BadgeType> mostRefusedTypes;
    private List<Structure> mostAssigningStructures;
    private List<User> topAssigningUsers;
    private List<User> topReceivingUsers;

    public Statistics() {
    }

    public Statistics(JsonObject statistics) {
        this.set(statistics);
    }

    public void setCountBadgeAssigned(JsonObject requestResult) {
        this.countBadgeAssigned = requestResult.getInteger(Field.COUNT);
    }

    public List<BadgeType> mostAssignedTypes() {
        return this.mostAssignedTypes != null ? this.mostAssignedTypes : new ArrayList<>();
    }

    public List<User> topAssigningUsers() {
        return this.topAssigningUsers != null ? this.topAssigningUsers : new ArrayList<>();
    }

    public List<User> topReceivingUsers() {
        return this.topReceivingUsers != null ? this.topReceivingUsers : new ArrayList<>();
    }

    public void setMostAssignedTypes(JsonArray requestResults) {
        this.mostAssignedTypes = new BadgeType().toList(requestResults);
    }

    public void setLessAssignedTypes(JsonArray requestResults) {
        this.lessAssignedTypes = new BadgeType().toList(requestResults);
    }

    public void setMostRefusedTypes(JsonArray requestResults) {
        this.mostRefusedTypes = new BadgeType().toList(requestResults);
    }

    public void setMostAssigningStructures(List<Structure> structures) {
        this.mostAssigningStructures = structures;
    }

    public void setTopAssigningUsers(JsonArray requestResults) {
        this.topAssigningUsers = new User().toList(requestResults);
    }

    public void setTopReceivingUsers(JsonArray requestResults) {
        this.topReceivingUsers = new User().toList(requestResults);
    }
    public void setTopAssigningUsers(List<User> users) {
        this.topAssigningUsers = users;
    }

    public void setTopReceivingUsers(List<User> users) {
        this.topReceivingUsers = users;
    }

    @Override
    public Statistics set(JsonObject statistics) {
        return this;
    }

    @Override
    public JsonObject toJson() {
        JsonObject result = new JsonObject()
                .put(Field.COUNTBADGEASSIGNED, countBadgeAssigned);

        if (mostAssignedTypes != null) result.put(Field.MOSTASSIGNEDTYPES, new BadgeType().toArray(mostAssignedTypes));
        if (lessAssignedTypes != null) result.put(Field.LESSASSIGNEDTYPES, new BadgeType().toArray(lessAssignedTypes));
        if (mostRefusedTypes != null) result.put(Field.MOSTREFUSEDTYPES, new BadgeType().toArray(mostRefusedTypes));
        if (mostAssigningStructures != null)
            result.put(Field.MOSTASSIGNINGSTRUCTURES, new Structure().toArray(mostAssigningStructures));
        if (topAssigningUsers != null) result.put(Field.TOPASSIGNINGUSERS, new User().toArray(topAssigningUsers));
        if (topReceivingUsers != null) result.put(Field.TOPRECEIVINGUSERS, new User().toArray(topReceivingUsers));

        return result;
    }

    @Override
    public Statistics model(JsonObject model) {
        return new Statistics(model);
    }
}