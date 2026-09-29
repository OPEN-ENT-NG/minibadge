package fr.openent.minibadge.service;

import io.vertx.core.Future;

import java.util.List;

public interface BadgeTypeSettingService {
    /**
     * Check if a badge type is self-assignable.
     * @param badgeTypeId  the ID of the badge type
     * @param structureIds the reader's structures, so a structure-scoped setting row wins over the
     *                     centralized one (see {@link fr.openent.minibadge.repository.BadgeTypeSettingRepository})
     * @return a Future that will complete with true if the badge type is self-assignable, false otherwise
     */
    Future<Boolean> isBadgeTypeSelfAssignable(Long badgeTypeId, List<String> structureIds);
}
