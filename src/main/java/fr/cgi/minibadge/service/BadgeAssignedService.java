package fr.cgi.minibadge.service;

import io.vertx.core.Future;
import org.entcore.common.user.UserInfos;

import java.util.List;

public interface BadgeAssignedService {
    /**
     * Create badge assigned with badge creation if not exists
     *
     * @param typeId type identifier
     * @param ownerIds list of badge owners identifier
     * @param assignor user that is assigning
     * @return return future
     */
    Future<Void> assign(long typeId, List<String> ownerIds, UserInfos assignor);
}
