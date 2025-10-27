package fr.openent.minibadge.service;

import fr.openent.minibadge.model.User;
import io.vertx.core.Future;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonArray;
import org.entcore.common.user.UserInfos;

import java.util.List;

public interface UserService {
    /**
     * Search users that are visible for me from query
     *
     * @param request request from which we need to retrieve users
     * @param user    current user that query search
     * @param typeId  badge type identifier on which we currently search users.
     * @param query   to filter on user firstName/lastName
     * @return return future containing list of users
     */
    Future<List<User>> search(HttpServerRequest request, UserInfos user, Long typeId, String query);

    /**
     * get users from ids
     *
     * @param userIds user identifiers
     * @return return future containing list of users
     */
    Future<List<User>> getUsers(List<String> userIds);

    /**
     * insert user or update the name of a user
     *
     * @param usersIds
     * @return
     */
    Future<Void> upsert(List<String> usersIds);

    /**
     * Replace user name by a default disable name if he refuse to use minibadges
     *
     * @param userId
     * @param host
     * @param language
     * @return
     */
    Future<JsonArray> anonimyzeUser(String userId, String host, String language);

    /**
     * Count users that gave me this (:typeId) badge typed
     *
     * @param typeId      type identifier
     * @param assigner    assigner that assigned this id typed badge
     * @param receiverIds that potentially received this typed badge by current assigner
     * @return return future containing list of users that received the typed badge from current assigner
     */
    Future<List<User>> getUnassignableUserIds(long typeId, UserInfos assigner, List<String> receiverIds);

    /**
     * get list of structures and substructures Ids from current sessionUser
     *
     * @param user current session user from which we want to get structures
     * @return return future containing list of structures and substructures Ids
     */
    Future<List<String>> getSessionUserStructureNSubstructureIds(UserInfos user);


    /**
     * get users that are visible for admin from query
     *
     * @param request request from which we need to retrieve users
     * @param query   to filter on user firstName/lastName
     * @return return future containing list of users
     */
    Future<List<User>> getVisibleUsersByAdminSearch(HttpServerRequest request, String query);

    /**
     * Remove minibadge preferences for a list of users
     *
     * @param userIds list of user identifiers
     * @return a future completed when the operation is done
     */
    Future<Void> removeMinibadgePreferencesForUsers(List<String> userIds);

    /**
     * Revoke users minibadge consent
     *
     * @param userIds list of user identifiers
     * @param request http server request
     * @return a future completed when the operation is done
     */
    Future<Void> revokeUsersMinibadgeConsent(List<String> userIds, HttpServerRequest request);
}
