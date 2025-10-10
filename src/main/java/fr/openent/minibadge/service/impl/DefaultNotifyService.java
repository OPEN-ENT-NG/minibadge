package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.Minibadge;
import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.core.constants.Notify;
import fr.openent.minibadge.service.BadgeTypeService;
import fr.openent.minibadge.service.NotifyService;
import fr.openent.minibadge.service.ServiceRegistry;
import fr.wseduc.webutils.I18n;
import fr.wseduc.webutils.Server;
import fr.wseduc.webutils.http.Renders;
import io.vertx.core.Vertx;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonObject;
import org.entcore.common.notification.TimelineHelper;
import org.entcore.common.user.UserInfos;

import java.util.List;
import java.util.stream.Collectors;

public class DefaultNotifyService implements NotifyService {

    private static final NotifyService instance = new DefaultNotifyService();
    private DefaultNotifyService() {}
    public static NotifyService getInstance() {
        return instance;
    }

    private final BadgeTypeService badgeTypeService = ServiceRegistry.getService(BadgeTypeService.class);

    @Override
    public void notifyBadgeAssigned(HttpServerRequest request, UserInfos assigner, List<String> ownerIds, long typeId) {
        String host = Renders.getHost(request);
        String language = I18n.acceptLanguage(request);

        List<String> ownerIdsWithoutAssigner = ownerIds.stream().filter(id -> !id.equals(assigner.getUserId())).collect(Collectors.toList());

        if (ownerIdsWithoutAssigner.isEmpty()) return;

        badgeTypeService.getBadgeType(assigner.getStructures(), typeId, host, language)
                .onSuccess(badgeType -> {
                    String uri = String.format("/minibadge#/badge-types/%s", badgeType.id());
                    JsonObject params = new JsonObject()
                            .put(Field.USERNAME, assigner.getUsername())
                            .put(Field.BADGETYPELABEL, badgeType.label())
                            .put(Field.BADGETYPELINK, uri)
                            .put(Field.RESOURCEURI, uri)
                            .put(Field.PUSHNOTIF, new JsonObject()
                                    .put(Field.TITLE, "minibadge.new.badge.assigned.title").put(Field.BODY, ""));

                    TimelineHelper timelineHelper = new TimelineHelper(
                            Vertx.currentContext().owner(),
                            Server.getEventBus(Vertx.currentContext().owner()),
                            Minibadge.minibadgeConfig.toJson());
                    timelineHelper.notifyTimeline(request, String.format("%s.%s", Minibadge.MINIBADGE, Notify.NEW_BADGE_ASSIGNED),
                            assigner, ownerIdsWithoutAssigner, params);
                });
    }
}
