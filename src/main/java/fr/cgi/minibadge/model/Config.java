package fr.cgi.minibadge.model;

import fr.cgi.minibadge.core.constants.Field;
import io.vertx.core.json.JsonObject;


public class Config implements Model<Config> {

    private Integer mostAssignedTypeListSize;
    private Integer lessAssignedTypeListSize;
    private Integer mostRefusedTypeListSize;
    private Integer mostAssigningUserListSize;
    private Integer mostAssigningStructureListSize;
    private Integer topAssigningUserListSize;
    private Integer topReceivingUserListSize;

    public Config() {
    }

    public Config(JsonObject statistics) {
        this.set(statistics);
    }

    @Override
    public Config set(JsonObject statistics) {
        this.mostAssignedTypeListSize = statistics.getInteger(Field.MOST_ASSIGNED_TYPE_LIST_SIZE);
        this.lessAssignedTypeListSize = statistics.getInteger(Field.LESS_ASSIGNED_TYPE_LIST_SIZE);
        this.mostRefusedTypeListSize = statistics.getInteger(Field.MOST_REFUSED_TYPE_LIST_SIZE);
        this.mostAssigningUserListSize = statistics.getInteger(Field.MOST_ASSIGNING_USER_LIST_SIZE);
        this.mostAssigningStructureListSize = statistics.getInteger(Field.MOST_ASSIGNING_STRUCTURE_LIST_SIZE);
        this.topAssigningUserListSize = statistics.getInteger(Field.TOP_ASSIGNING_USER_LIST_SIZE);
        this.topReceivingUserListSize = statistics.getInteger(Field.TOP_RECEIVING_USER_LIST_SIZE);
        return this;
    }

    public Integer mostAssignedTypeListSize() {
        return this.mostAssignedTypeListSize != null ? this.mostAssignedTypeListSize : 15;
    }
    public Integer lessAssignedTypeListSize() {
        return this.lessAssignedTypeListSize != null ? this.lessAssignedTypeListSize : 15;
    }

    public Integer mostRefusedTypeListSize() {
        return this.mostRefusedTypeListSize != null ? this.mostRefusedTypeListSize : 3;
    }

    public Integer mostAssigningUserListSize() {
        return this.mostAssigningUserListSize != null ? this.mostAssigningUserListSize : 3;
    }

    public Integer mostAssigningStructureListSize() {
        return this.mostAssigningStructureListSize != null ? this.mostAssigningStructureListSize : 5;
    }

    public Integer topAssigningUserListSize() {
        return this.topAssigningUserListSize != null ? this.topAssigningUserListSize : 5;
    }

    public Integer topReceivingUserListSize() {
        return this.topReceivingUserListSize != null ? this.topReceivingUserListSize : 5;
    }

    @Override
    public JsonObject toJson() {
        return new JsonObject()
                .put(Field.MOST_ASSIGNED_TYPE_LIST_SIZE, mostAssignedTypeListSize)
                .put(Field.LESS_ASSIGNED_TYPE_LIST_SIZE, lessAssignedTypeListSize)
                .put(Field.MOST_REFUSED_TYPE_LIST_SIZE, mostRefusedTypeListSize)
                .put(Field.MOST_ASSIGNING_USER_LIST_SIZE, mostAssigningUserListSize)
                .put(Field.MOST_ASSIGNING_STRUCTURE_LIST_SIZE, mostAssigningStructureListSize)
                .put(Field.TOP_ASSIGNING_USER_LIST_SIZE, topAssigningUserListSize)
                .put(Field.TOP_RECEIVING_USER_LIST_SIZE, topReceivingUserListSize);
    }

    @Override
    public Config model(JsonObject model) {
        return new Config(model);
    }
}