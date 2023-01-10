package fr.cgi.minibadge.service;

import fr.cgi.minibadge.model.User;
import fr.cgi.minibadge.model.BadgeAssigned;
import io.vertx.core.Future;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.json.JsonArray;
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

    /**
     * Get All the badges the user have given
     *
     * @param eb         EventBus
     * @param query      filters
     * @param startDate  Start Date
     * @param endDate    End Date
     * @param sortType   column sorted
     * @param sortAsc    sort Asc
     * @param assignorId user id who give the badges
     * @return return future
     */
    Future<List<BadgeAssigned>> getBadgesGiven(EventBus eb, String query, String startDate, String endDate, String sortType, Boolean sortAsc, String assignorId);

    /**
     * revoke a badge
     *
     * @param userId
     * @param badgeId
     * @return
     */
    Future<JsonArray> revoke(String userId, long badgeId);

    /**
     * Get users that gave me this (:typeId) badge typed
     *
     * @param typeId type identifier
     * @param badgeOwner owner that received this id typed badge
     * @param limit max number of occurrences
     * @param offset position from where getting occurrences
     * @return return future containing list of users
     */
    Future<List<User>> getBadgeTypeAssigners(long typeId, UserInfos badgeOwner, int limit, Integer offset);

    /**
     * Get type total assignations
     *
     * @param typeId type identifier
     * @param badgeOwner owner that received this id typed badge
     *
     * @return return future containing total assignations
     */
    Future<Integer> getTotalAssignations(long typeId, UserInfos badgeOwner);

    /**
     * Count users that gave me this (:typeId) badge typed
     *
     * @param typeId type identifier
     * @param badgeOwner owner that received this id typed badge
     * @return return future containing assigners count
     */
    Future<Integer> countBadgeTypeAssigners(long typeId, UserInfos badgeOwner);
}
