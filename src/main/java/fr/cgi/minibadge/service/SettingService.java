package fr.cgi.minibadge.service;

import fr.cgi.minibadge.model.GlobalSettings;

public interface SettingService {

    /**
     * get global settings
     * @return global settings
     */
    GlobalSettings getGlobalSettings();
}
