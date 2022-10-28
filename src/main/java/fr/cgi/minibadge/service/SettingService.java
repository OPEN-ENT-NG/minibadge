package fr.cgi.minibadge.service;

import fr.cgi.minibadge.model.GlobalSettings;
import io.vertx.core.Future;
import org.entcore.common.user.UserInfos;

public interface SettingService {

    /**
     * get global settings
     * @return global settings
     */
    Future<GlobalSettings> getGlobalSettings(UserInfos user);
}
