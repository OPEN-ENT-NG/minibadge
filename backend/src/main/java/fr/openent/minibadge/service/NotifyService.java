package fr.openent.minibadge.service;

import io.vertx.core.http.HttpServerRequest;
import org.entcore.common.user.UserInfos;

import java.util.List;

public interface NotifyService {

    /**
     * notify when badge is assigned
     *
     * @param request  current request
     * @param assigner user that assigned the current badge type
     * @param ownerIds user identifiers that received the current badge type
     * @param typeId   badge type identifier concerned
     */
    void notifyBadgeAssigned(HttpServerRequest request, UserInfos assigner, List<String> ownerIds, long typeId);

    /**
     * notify when users are revoked from to minibadge
     *
     * @param request current request
     * @param admin   user that revoked the current badge type
     * @param userIds user identifiers that had the current badge type revoked
     */
    void notifyRevokeUsers(HttpServerRequest request, UserInfos admin, List<String> userIds);
}
