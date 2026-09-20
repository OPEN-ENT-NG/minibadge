package fr.openent.minibadge.service;

import fr.openent.minibadge.model.Badge;
import fr.openent.minibadge.model.User;
import io.vertx.core.Future;

import java.util.List;

public interface BadgeService {
    /**
     * Creates badges if not exists
     *
     * @param typeId   type identifier
     * @param ownerIds badge owner identifiers
     * @return return future
     */
    Future<Void> createBadges(long typeId, List<String> ownerIds);

    /**
     * Creates badges if not exists
     *
     * @param ownerId owner identifier
     * @param query   to filter on badge type label
     * @return return badge list of current user
     */
    Future<List<Badge>> getBadges(String ownerId, String query);

    /**
     * Publish badge from type and current user
     *
     * @param ownerId owner identifier
     * @param typeId  Type identifier
     * @return return future ending process
     */
    Future<Void> publishBadge(String ownerId, long typeId);

    /**
     * Privatize badge from type and current user
     *
     * @param ownerId owner identifier
     * @param typeId  Type identifier
     * @return return future ending process
     */
    Future<Void> privatizeBadge(String ownerId, long typeId);

    /**
     * Refuse badge from type and current user
     *
     * @param ownerId owner identifier
     * @param typeId  Type identifier
     * @return return future ending process
     */
    Future<Void> refuseBadge(String ownerId, long typeId);

    /**
     * Disable badges from current user
     *
     * @param ownerId  owner identifier
     * @param host
     * @param language
     * @return return future ending process
     */
    Future<Void> disableBadges(String ownerId, String host, String language);

    /**
     * Enable badges from current user
     *
     * @param ownerId owner identifier
     * @return return future ending process
     */
    Future<Void> enableBadges(String ownerId);

    /**
     * Get users that received this (:typeId) badge typed
     *
     * @param typeId type identifier
     * @param limit  max number of occurrences
     * @param offset position from where getting occurrences
     * @return return future containing list of users
     */
    Future<List<User>> getBadgeTypeReceivers(long typeId, int limit, Integer offset);

    /**
     * Count users that received this (:typeId) badge typed
     *
     * @param typeId type identifier
     * @return return future containing receivers count
     */
    Future<Integer> countTotalReceivers(long typeId);
}
