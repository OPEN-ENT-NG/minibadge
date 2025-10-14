package fr.openent.minibadge.repository;

import fr.openent.minibadge.model.BadgeCategory;
import io.vertx.core.Future;

import java.util.List;

public interface BadgeCategoryRepository {
    /**
     * Retrieves a list of BadgeCategory entities associated with a specific badge type ID.
     *
     * @param badgeTypeId The ID of the badge type for which the categories are to be retrieved.
     * @return A Future containing a list of BadgeCategory entities.
     */
    Future<List<BadgeCategory>> findByBadgeTypeId(long badgeTypeId);

    /**
     * Retrieves all BadgeCategory entities.
     *
     * @return A Future containing a list of all BadgeCategory entities.
     */
    Future<List<BadgeCategory>> findAll();
}
