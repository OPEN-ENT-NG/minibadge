package fr.cgi.minibadge.model;

import fr.cgi.minibadge.core.constants.Field;
import io.vertx.core.json.JsonObject;

//CORRESPOND A LA TABLE : https://confluence.support-ent.fr/display/BAD/Ajout+de+la+table+Protagoniste
public class BadgeProtagonistSetting implements Model<BadgeProtagonistSetting> {
    String type;
    String typeValue;
    String label;

    public BadgeProtagonistSetting() {
    }

    public BadgeProtagonistSetting(JsonObject badgeProtagonistSetting) {
        this.set(badgeProtagonistSetting);
    }

    @Override
    public JsonObject toJson() {
        return new JsonObject()
                .put(Field.TYPE, type)
                .put(Field.TYPEVALUE, typeValue)
                .put(Field.LABEL, label);
    }

    public String type() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String typeValue() {
        return typeValue;
    }

    @Override
    public BadgeProtagonistSetting model(JsonObject model) {
        return new BadgeProtagonistSetting(model);
    }

    @Override
    public BadgeProtagonistSetting set(JsonObject model) {
        this.type = model.getString(Field.TYPE);
        this.typeValue = model.getString(Field.TYPEVALUE);
        this.label = model.getString(Field.LABEL);
        return this;
    }
}
