package fr.cgi.minibadge.service;

import fr.cgi.minibadge.model.User;
import io.vertx.core.Future;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonArray;

import java.util.List;

public interface UserService {
    /**
     * Search users that are visible for me from query
     *
     * @param request request from which we need to retrieve users
     * @param query   to filter on user firstName/lastName
     * @return return future containing list of users
     */
    Future<List<User>> search(HttpServerRequest request, String query);

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
     * @param userId
     * @param host
     * @param language
     * @return
     */
    Future<JsonArray> anonimyzeUser(String userId, String host, String language);
}
