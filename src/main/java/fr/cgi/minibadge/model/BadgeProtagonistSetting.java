package fr.cgi.minibadge.model;

import fr.cgi.minibadge.core.constants.Field;
import io.vertx.core.json.JsonObject;

//CORRESPOND A LA TABLE : https://confluence.support-ent.fr/display/BAD/Ajout+de+la+table+Protagoniste
public class BadgeProtagonistSetting implements Model<BadgeProtagonistSetting> {
    String typeId;
    String type ;

    public BadgeProtagonistSetting() {
    }

    @Override
    public JsonObject toJson() {
        return new JsonObject().put(Field.TYPE, type)
                .put(Field.TYPEID, typeId);
    }

    public String getTypeId() {
        return typeId;
    }

    public void setTypeId(String typeId) {
        this.typeId = typeId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    @Override
    public BadgeProtagonistSetting model(JsonObject model) {
        return null;
    }

    @Override
    public BadgeProtagonistSetting set(JsonObject model) {
        return null;
    }
}
