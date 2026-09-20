package fr.openent.minibadge.service;

import io.vertx.core.Future;

public interface BadgeTypeSettingService {
    /**
     * Check if a badge type is self-assignable.
     * @param badgeTypeId the ID of the badge type
     * @return a Future that will complete with true if the badge type is self-assignable, false otherwise
     */
    Future<Boolean> isBadgeTypeSelfAssignable(Long badgeTypeId);
}
