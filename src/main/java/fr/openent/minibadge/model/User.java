package fr.openent.minibadge.model;

import fr.openent.minibadge.core.constants.Field;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.user.UserInfos;


public class User extends UserInfos implements Model<User> {

    private Integer badgeAssignedTotal;
    private Chart permissions;
    private Integer countAssigned;

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

    @Override
    public JsonObject toJson() {
        return new JsonObject()
                .put(Field.ID, this.getUserId())
                .put(Field.FIRSTNAME, this.getFirstName())
                .put(Field.LASTNAME, this.getLastName())
                .put(Field.DISPLAYNAME, this.getUsername())
                .put(Field.PROFILE, this.getType())
                .put(Field.COUNTASSIGNED, this.countAssigned)
                .put(Field.BADGEASSIGNEDTOTAL, this.badgeAssignedTotal);
    }

    @Override
    public User model(JsonObject user) {
        return new User(user);
    }

    public Chart permissions() {
        return permissions;
    }
}