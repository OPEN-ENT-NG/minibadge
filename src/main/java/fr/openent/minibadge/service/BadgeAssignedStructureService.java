package fr.openent.minibadge.service;

import fr.openent.minibadge.model.BadgeAssigned;
import io.vertx.core.Future;
import org.entcore.common.user.UserInfos;

import java.util.List;

public interface BadgeAssignedStructureService {

    /**
     * Creates association between new badges assignations and structure(s) related
     *
     * @param badgeAssigned list containing assignations to associate with structure
     * @param ownerIds      list of badge owners related to all new badgeAssigned
     * @param assignor      assignor related to all new badgeAssigned
     * @return return future
     */
    Future<Void> createBadgeAssignedStructures(List<BadgeAssigned> badgeAssigned,
                                               List<String> ownerIds, UserInfos assignor);

    /**
     * Creates association between new badges assignations and structure(s) related
     *
     * @param badgeAssigned list containing assignations to associate with structure
     * @param users         list of users related to all badgeAssigned
     * @return return future testifying success of the procedure
     */
    Future<Void> createBadgeAssignedStructures(List<BadgeAssigned> badgeAssigned, List<String> users);

    /**
     * Create association between badges assignations and structure(s) related when it does not exist
     *
     * @return return future containing a list of <BadgeAssigned>
     */
    Future<Void> synchronizeAssignationsWithoutStructures();

    /**
     * Get badges assignations list that have not been associated with structure
     *
     * @return return future containing a list of <BadgeAssigned>
     */
    Future<List<BadgeAssigned>> getAssignationsWithoutStructuresLinked();
}
