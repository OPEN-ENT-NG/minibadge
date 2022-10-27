package fr.cgi.minibadge.service;

import fr.cgi.minibadge.model.User;
import io.vertx.core.Future;
import io.vertx.core.http.HttpServerRequest;

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

    Future<Void> upsert(List<String> usersIds);
}
