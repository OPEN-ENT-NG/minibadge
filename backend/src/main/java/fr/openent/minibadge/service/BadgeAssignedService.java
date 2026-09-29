package fr.openent.minibadge.service;

import fr.openent.minibadge.model.BadgeAssigned;
import fr.openent.minibadge.model.User;
import io.vertx.core.Future;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.json.JsonArray;
import org.entcore.common.user.UserInfos;

import java.util.List;

public interface BadgeAssignedService {
    /** Epic C: stable failure (doubling as its i18n key) when the badge type's end date is already past. */
    String BADGE_TYPE_EXPIRED_ERROR = "minibadge.error.badge.type.expired";

    /**
     * Epic C: stable failure (doubling as its i18n key) when the assignor still holds an ACTIVE (not
     * revoked, not expired) assignment of this badge type to one of the owners.
     */
    String ALREADY_ASSIGNED_ERROR = "minibadge.error.badge.already.assigned";

    /**
     * Create badge assigned with badge creation if not exists.
     * <p>
     * Epic C: the end date that applies to the assignor (establishment setting first, central one
     * otherwise) is frozen into each new assignment's {@code expires_at}. Fails with
     * {@link #BADGE_TYPE_EXPIRED_ERROR} when that end date is past, and with
     * {@link #ALREADY_ASSIGNED_ERROR} when an active assignment by the same assignor already exists
     * (including a concurrent duplicate caught by the unique index). Both decisions are taken by the
     * INSERT statement itself, against the database clock; on refusal no assignment is written (the
     * owners' badge rows, created beforehand, may exist without one).
     *
     * @param typeId   type identifier
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
     * @param typeId     type identifier
     * @param badgeOwner owner that received this id typed badge
     * @param limit      max number of occurrences
     * @param offset     position from where getting occurrences
     * @return return future containing list of users
     */
    Future<List<User>> getBadgeTypeAssigners(long typeId, UserInfos badgeOwner, int limit, Integer offset);

    /**
     * Count users that gave me this (:typeId) badge typed
     *
     * @param typeId     type identifier
     * @param badgeOwner owner that received this id typed badge
     * @return return future containing assigners count
     */
    Future<Integer> countTotalAssigners(long typeId, UserInfos badgeOwner);

    /**
     * Check if the user has assigned himself a badge of this type
     * @param userInfos user information
     * @param typeId    type identifier
     * @return return future containing boolean
     */
    Future<Boolean> isSelfAssigned(UserInfos userInfos, long typeId);

    /**
     * Get all assigned badges with filters
     *
     * @param query     filters
     * @param startDate Start Date
     * @param endDate   End Date
     * @param sortType  column sorted
     * @param sortAsc   sort Asc
     * @param structureIds list of structure ids
     * @return return future
     */
    Future<List<BadgeAssigned>> getAllAssignedBadges(String query, String startDate, String endDate, String sortType, Boolean sortAsc, List<String> structureIds);
}
