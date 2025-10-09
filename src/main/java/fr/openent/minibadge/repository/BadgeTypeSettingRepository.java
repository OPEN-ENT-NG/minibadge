package fr.openent.minibadge.repository;

import fr.openent.minibadge.model.entity.BadgeTypeSetting;
import io.vertx.core.Future;

import java.util.Optional;

public interface BadgeTypeSettingRepository {
    /**
     * Find a BadgeTypeSetting by its badgeTypeId.
     * @param badgeTypeId the ID of the badge type
     * @return a Future containing an Optional with the BadgeTypeSetting if found, or empty if not found
     */
    Future<Optional<BadgeTypeSetting>> findByBadgeTypeId(long badgeTypeId);
}
