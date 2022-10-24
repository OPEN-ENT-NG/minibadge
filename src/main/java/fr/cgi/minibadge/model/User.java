package fr.cgi.minibadge.model;

import fr.cgi.minibadge.core.constants.Field;
import io.vertx.core.json.JsonObject;
import org.entcore.common.user.UserInfos;


public class User extends UserInfos implements Model<User> {

    Chart permissions;

    public User() {
    }

    public User(JsonObject user) {
        this.set(user);
    }

    @Override
    public User set(JsonObject user) {
        this.setUserId(user.getString(Field.ID));
        this.setFirstName(user.getString(Field.FIRSTNAME));
        this.setLastName(user.getString(Field.LASTNAME));
        this.setUsername(user.getString(Field.USERNAME));
        this.permissions = new Chart(user);
        return this;
    }

    @Override
    public JsonObject toJson() {
        return new JsonObject()
                .put(Field.ID, this.getUserId())
                .put(Field.FIRSTNAME, this.getFirstName())
                .put(Field.LASTNAME, this.getLastName())
                .put(Field.DISPLAYNAME, this.getUsername());
    }

    @Override
    public User model(JsonObject user) {
        return new User(user);
    }

    public Chart permissions() {
        return permissions;
    }
}