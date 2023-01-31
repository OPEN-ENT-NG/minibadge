package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.Minibadge;
import fr.openent.minibadge.core.constants.Request;
import fr.openent.minibadge.helper.PromiseHelper;
import fr.openent.minibadge.helper.SettingHelper;
import fr.openent.minibadge.helper.SqlHelper;
import fr.openent.minibadge.model.GlobalSettings;
import fr.openent.minibadge.model.ThresholdSetting;
import fr.openent.minibadge.service.SettingService;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;
import org.entcore.common.user.UserInfos;

import java.util.List;

public class DefaultSettingService implements SettingService {

    public DefaultSettingService() {
        // At this moment, this service is not other service dependant
    }

    public Future<GlobalSettings> getGlobalSettings(UserInfos user) {
        Promise<GlobalSettings> promise = Promise.promise();
        GlobalSettings globalSettings = new GlobalSettings(new JsonObject().put(Request.PAGESIZE, Minibadge.PAGE_SIZE));
        getThresholdsByPeriod(user, SettingHelper.getDefaultBadgeSettings())
                .onSuccess(badgeSettings -> promise.complete(globalSettings.setBadgeSettings(badgeSettings)))
                .onFailure(promise::fail);

        return promise.future();
    }

    public Future<List<ThresholdSetting>> getThresholdsByPeriod(UserInfos user, List<ThresholdSetting> thresholdSettings) {
        Promise<List<ThresholdSetting>> promise = Promise.promise();
        getThresholdsByPeriodRequest(user, thresholdSettings)
                .onSuccess(thresholds -> promise.complete(setBadgeSettingsThresholds(thresholdSettings, thresholds)))
                .onFailure(promise::fail);
        return promise.future();
    }

    private List<ThresholdSetting> setBadgeSettingsThresholds(List<ThresholdSetting> thresholdSettings, JsonObject thresholds) {
        thresholdSettings.forEach(badgeSetting -> badgeSetting.setAssignationsNumber(
                thresholds.getInteger(badgeSetting.thresholdPeriodAssignable(), 0)
        ));

        return thresholdSettings;
    }

    private Future<JsonObject> getThresholdsByPeriodRequest(UserInfos user, List<ThresholdSetting> thresholdSettings) {
        Promise<JsonObject> promise = Promise.promise();
        JsonArray params = new JsonArray();
        String request = String.format(" SELECT %s", SqlHelper.getCTEThresholdsRequests(thresholdSettings, user, params));

        Sql.getInstance().prepared(request, params, SqlResult.validUniqueResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::getThresholdsByPeriodRequest] Fail to get threshold status",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }

}
