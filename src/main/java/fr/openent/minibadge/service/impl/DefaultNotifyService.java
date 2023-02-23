package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.Minibadge;
import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.core.constants.Notify;
import fr.openent.minibadge.service.BadgeTypeService;
import fr.openent.minibadge.service.NotifyService;
import fr.wseduc.webutils.I18n;
import fr.wseduc.webutils.http.Renders;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import org.entcore.common.notification.TimelineHelper;
import org.entcore.common.user.UserInfos;

import java.util.List;

public class DefaultNotifyService implements NotifyService {
    private final TimelineHelper timelineHelper;
    private final BadgeTypeService badgeTypeService;

    public DefaultNotifyService(TimelineHelper timelineHelper, BadgeTypeService badgeTypeService) {
        this.timelineHelper = timelineHelper;
        this.badgeTypeService = badgeTypeService;
    }

    @Override
    public void notifyBadgeAssigned(HttpServerRequest request, UserInfos assigner, List<String> ownerIds, long typeId) {
        String host = Renders.getHost(request);
        String language = I18n.acceptLanguage(request);

        badgeTypeService.getBadgeType(assigner.getStructures(), typeId, host, language)
                .onSuccess(badgeType -> {
                    JsonObject params = new JsonObject()
                            .put(Field.USERNAME, assigner.getUsername())
                            .put(Field.BADGETYPELABEL, badgeType.label())
                            .put(Field.BADGETYPELINK, String.format("/minibadge#/badge-types/%s", badgeType.id()))
                            .put(Field.PUSHNOTIF, new JsonObject()
                                    .put(Field.TITLE, "minibadge.new.badge.assigned.title").put(Field.BODY, ""));

                    timelineHelper.notifyTimeline(request, String.format("%s.%s", Minibadge.MINIBADGE, Notify.NEW_BADGE_ASSIGNED),
                            assigner, ownerIds, params);
                });
    }
}
