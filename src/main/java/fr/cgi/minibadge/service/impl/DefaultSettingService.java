package fr.cgi.minibadge.service.impl;

import fr.cgi.minibadge.Minibadge;
import fr.cgi.minibadge.core.constants.Request;
import fr.cgi.minibadge.model.GlobalSettings;
import fr.cgi.minibadge.service.SettingService;
import io.vertx.core.json.JsonObject;

public class DefaultSettingService implements SettingService {

    public DefaultSettingService() {
        // At this moment, this service is not other service dependant
    }

    @Override
    public GlobalSettings getGlobalSettings() {
        return new GlobalSettings(new JsonObject().put(Request.PAGESIZE, Minibadge.PAGE_SIZE));
    }
}
