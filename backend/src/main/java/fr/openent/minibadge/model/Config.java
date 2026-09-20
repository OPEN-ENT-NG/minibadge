package fr.openent.minibadge.model;

import fr.openent.minibadge.core.constants.DateConst;
import fr.openent.minibadge.core.constants.Field;
import io.vertx.core.json.JsonObject;


public class Config implements Model<Config> {
    private Integer defaultMaxAssignable;
    private String defaultPeriodAssignable;
    private Integer mostAssignedTypeListSize;
    private Integer lessAssignedTypeListSize;
    private Integer mostRefusedTypeListSize;
    private Integer mostAssigningUserListSize;
    private Integer mostAssigningStructureListSize;
    private Integer topAssigningUserListSize;
    private Integer topReceivingUserListSize;
    private Integer typeListsUsersSize;

    public Config() {
        this.set(new JsonObject());
    }

    public Config(JsonObject config) {
        this.set(config);
    }

    @Override
    public Config set(JsonObject config) {
        this.defaultMaxAssignable = config.getInteger(Field.DEFAULT_MAX_ASSIGNABLE, 3);
        this.defaultPeriodAssignable = config.getString(Field.DEFAULT_PERIOD_ASSIGNABLE, DateConst.DAY);
        this.mostAssignedTypeListSize = config.getInteger(Field.MOST_ASSIGNED_TYPE_LIST_SIZE, 15);
        this.lessAssignedTypeListSize = config.getInteger(Field.LESS_ASSIGNED_TYPE_LIST_SIZE, 15);
        this.mostRefusedTypeListSize = config.getInteger(Field.MOST_REFUSED_TYPE_LIST_SIZE, 3);
        this.mostAssigningUserListSize = config.getInteger(Field.MOST_ASSIGNING_USER_LIST_SIZE, 3);
        this.mostAssigningStructureListSize = config.getInteger(Field.MOST_ASSIGNING_STRUCTURE_LIST_SIZE, 5);
        this.topAssigningUserListSize = config.getInteger(Field.TOP_ASSIGNING_USER_LIST_SIZE, 3);
        this.topReceivingUserListSize = config.getInteger(Field.TOP_RECEIVING_USER_LIST_SIZE, 3);
        this.typeListsUsersSize = config.getInteger(Field.TYPE_LISTS_USERS_SIZE, 10);
        return this;
    }

    public Integer defaultMaxAssignable() {
        return this.defaultMaxAssignable;
    }

    public String defaultPeriodAssignable() {
        return this.defaultPeriodAssignable;
    }

    public Integer mostAssignedTypeListSize() {
        return this.mostAssignedTypeListSize;
    }
    public Integer lessAssignedTypeListSize() {
        return this.lessAssignedTypeListSize;
    }

    public Integer mostRefusedTypeListSize() {
        return this.mostRefusedTypeListSize;
    }

    public Integer mostAssigningUserListSize() {
        return this.mostAssigningUserListSize;
    }

    public Integer mostAssigningStructureListSize() {
        return this.mostAssigningStructureListSize;
    }

    public Integer topAssigningUserListSize() {
        return this.topAssigningUserListSize;
    }

    public Integer topReceivingUserListSize() {
        return this.topReceivingUserListSize;
    }

    public Integer typeListsUsersSize() {
        return this.typeListsUsersSize;
    }

    @Override
    public JsonObject toJson() {
        return new JsonObject()
                .put(Field.DEFAULT_MAX_ASSIGNABLE, defaultMaxAssignable)
                .put(Field.MOST_ASSIGNED_TYPE_LIST_SIZE, mostAssignedTypeListSize)
                .put(Field.LESS_ASSIGNED_TYPE_LIST_SIZE, lessAssignedTypeListSize)
                .put(Field.MOST_REFUSED_TYPE_LIST_SIZE, mostRefusedTypeListSize)
                .put(Field.MOST_ASSIGNING_USER_LIST_SIZE, mostAssigningUserListSize)
                .put(Field.MOST_ASSIGNING_STRUCTURE_LIST_SIZE, mostAssigningStructureListSize)
                .put(Field.TOP_ASSIGNING_USER_LIST_SIZE, topAssigningUserListSize)
                .put(Field.TOP_RECEIVING_USER_LIST_SIZE, topReceivingUserListSize)
                .put(Field.TYPE_LISTS_USERS_SIZE, typeListsUsersSize);
    }

    @Override
    public Config model(JsonObject model) {
        return new Config(model);
    }
}