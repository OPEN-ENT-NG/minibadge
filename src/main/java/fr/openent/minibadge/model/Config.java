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
    }

    public Config(JsonObject config) {
        this.set(config);
    }

    @Override
    public Config set(JsonObject config) {
        this.defaultMaxAssignable = config.getInteger(Field.DEFAULT_MAX_ASSIGNABLE);
        this.defaultPeriodAssignable = config.getString(Field.DEFAULT_PERIOD_ASSIGNABLE);
        this.mostAssignedTypeListSize = config.getInteger(Field.MOST_ASSIGNED_TYPE_LIST_SIZE);
        this.lessAssignedTypeListSize = config.getInteger(Field.LESS_ASSIGNED_TYPE_LIST_SIZE);
        this.mostRefusedTypeListSize = config.getInteger(Field.MOST_REFUSED_TYPE_LIST_SIZE);
        this.mostAssigningUserListSize = config.getInteger(Field.MOST_ASSIGNING_USER_LIST_SIZE);
        this.mostAssigningStructureListSize = config.getInteger(Field.MOST_ASSIGNING_STRUCTURE_LIST_SIZE);
        this.topAssigningUserListSize = config.getInteger(Field.TOP_ASSIGNING_USER_LIST_SIZE);
        this.topReceivingUserListSize = config.getInteger(Field.TOP_RECEIVING_USER_LIST_SIZE);
        this.typeListsUsersSize = config.getInteger(Field.TYPE_LISTS_USERS_SIZE);
        return this;
    }

    public Integer defaultMaxAssignable() {
        return this.defaultMaxAssignable != null ? this.defaultMaxAssignable : 3;
    }

    public String defaultPeriodAssignable() {
        return this.defaultPeriodAssignable != null ? this.defaultPeriodAssignable : DateConst.DAY;
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

    public Integer typeListsUsersSize() {
        return this.typeListsUsersSize != null ? this.typeListsUsersSize : 10;
    }

    @Override
    public JsonObject toJson() {
        return new JsonObject()
                .put(Field.DEFAULT_MAX_ASSIGNABLE, defaultMaxAssignable)
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