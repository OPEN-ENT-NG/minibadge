package fr.openent.minibadge.model;

import fr.openent.minibadge.core.constants.Field;
import io.vertx.core.json.JsonObject;

//CORRESPOND A LA TABLE : https://confluence.support-ent.fr/display/BAD/Ajout+de+la+table+Protagoniste
public class BadgeProtagonistSettingRelation implements Model<BadgeProtagonistSettingRelation> {

    //A changer des que la bdd sera opérationnelle
    BadgeProtagonistSetting assignor;
    BadgeProtagonistSetting receiver;

    public BadgeProtagonistSettingRelation() {
    }
    public BadgeProtagonistSettingRelation(JsonObject badgeProtagonistSettingRelation) {
        this.set(badgeProtagonistSettingRelation);
    }

    public BadgeProtagonistSettingRelation(BadgeProtagonistSetting assignor, BadgeProtagonistSetting receiver) {
        this.setAssignor(assignor);
        this.setReceiver(receiver);
    }

    @Override
    public JsonObject toJson() {
        return new JsonObject().put(Field.ASSIGNORTYPE, assignor.toJson())
                .put(Field.RECEIVERTYPE, receiver.toJson());
    }

    public BadgeProtagonistSetting assignor() {
        return assignor;
    }

    public void setAssignor(BadgeProtagonistSetting assignor) {
        this.assignor = assignor;
    }

    public BadgeProtagonistSetting receiver() {
        return receiver;
    }

    public void setReceiver(BadgeProtagonistSetting receiver) {
        this.receiver = receiver;
    }

    @Override
    public BadgeProtagonistSettingRelation model(JsonObject model) {
        return new BadgeProtagonistSettingRelation(model);
    }

    @Override
    public BadgeProtagonistSettingRelation set(JsonObject model) {
        this.assignor = new BadgeProtagonistSetting(model.getJsonObject(Field.ASSIGNORTYPE, new JsonObject()));
        this.receiver = new BadgeProtagonistSetting(model.getJsonObject(Field.RECEIVERTYPE, new JsonObject()));
        return this;
    }
}
