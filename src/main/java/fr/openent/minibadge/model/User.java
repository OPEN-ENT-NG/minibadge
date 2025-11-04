package fr.openent.minibadge.model;

import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.core.enums.MinibadgeUserState;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.user.UserInfos;

import java.util.List;

import static fr.openent.minibadge.core.constants.Field.*;


public class User extends UserInfos implements Model<User> {

    private Integer badgeAssignedTotal;
    private Chart permissions;
    private Integer countAssigned;
    private MinibadgeUserState minibadgeUserState;

    public User() {
    }

    public User(JsonObject user) {
        this.set(user);
    }

    public User(UserInfos user) {
        this.setUserId(user.getUserId());
        this.setFirstName(user.getFirstName());
        this.setLastName(user.getLastName());
        this.setUsername(user.getUsername());
        this.setType(user.getType());
        this.setStructures(user.getStructures());
        this.setStructureNames(user.getStructureNames());
    }

    @Override
    @SuppressWarnings("unchecked")
    public User set(JsonObject user) {
        this.setUserId(user.getString(Field.ID));
        this.setFirstName(user.getString(Field.FIRSTNAME));
        this.setLastName(user.getString(Field.LASTNAME));
        this.setUsername(user.getString(Field.USERNAME));
        this.setType(user.getString(Field.TYPE));
        this.setStructures(user.getJsonArray(Field.STRUCTUREIDS, new JsonArray()).getList());
        this.setStructureNames(user.getJsonArray(STRUCTURENAMES, new JsonArray()).getList());
        this.badgeAssignedTotal = user.getInteger(Field.BADGE_ASSIGNED_TOTAL);
        this.countAssigned = user.getInteger(Field.COUNT_ASSIGNED);
        this.permissions = new Chart(user);
        return this;
    }

    public Integer countAssigned() {
        return this.countAssigned;
    }

    public void setCountAssigned(Integer countAssigned) {
        this.countAssigned = countAssigned;
    }

    public MinibadgeUserState getMinibadgeUserState() {
        return minibadgeUserState;
    }

    public void setMinibadgeUserState(MinibadgeUserState minibadgeUserState) {
        this.minibadgeUserState = minibadgeUserState;
    }

    @Override
    public JsonObject toJson() {
        JsonObject json = new JsonObject()
                .put(ID, this.getUserId())
                .put(FIRSTNAME, this.getFirstName())
                .put(LASTNAME, this.getLastName())
                .put(DISPLAYNAME, this.getUsername())
                .put(PROFILE, this.getType())
                .put(COUNTASSIGNED, this.countAssigned)
                .put(BADGEASSIGNEDTOTAL, this.badgeAssignedTotal)
                .put(STRUCTUREIDS, this.getStructures())
                .put(STRUCTURENAMES, this.getStructureNames());

        if (this.minibadgeUserState != null) {
            json.put(MINIBADGEUSERSTATE, this.minibadgeUserState.name());
        }

        return  json;
    }

    @Override
    public User model(JsonObject user) {
        return new User(user);
    }

    public Chart permissions() {
        return permissions;
    }
}