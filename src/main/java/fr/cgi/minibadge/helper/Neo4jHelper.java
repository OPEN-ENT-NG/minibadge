package fr.cgi.minibadge.helper;

import fr.cgi.minibadge.core.constants.Field;
import fr.cgi.minibadge.core.constants.Request;
import io.vertx.core.json.JsonObject;
import org.apache.commons.lang3.StringUtils;
import org.entcore.common.user.UserInfos;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public class Neo4jHelper {
    private Neo4jHelper() {
        throw new IllegalStateException("Utility class");
    }


    public static String searchQueryInColumns(String query, List<String> columns, JsonObject params) {
        if (query == null || query.isEmpty()) return "";

        List<String> queryPieces = Arrays.stream(StringUtils.stripAccents(query)
                        .toLowerCase()
                        .split("\\s*,\\s*"))
                .collect(Collectors.toList());

        params.put(Request.QUERY, queryPieces);
        return String.format(" (%s) ",
                columns.stream().map(column -> queryPieces.stream()
                                .map(queryPiece -> String.format("ANY(query IN {%s} WHERE TOLOWER(%s) CONTAINS query)",
                                        Request.QUERY, column))
                                .collect(Collectors.joining(" OR ")))
                        .collect(Collectors.joining(" OR "))
        );
    }

    public static String filterUsersFromIds(List<String> userIds, JsonObject params) {
        return filterUsersFromIds(userIds, null, params);
    }

    public static String filterUsersFromIds(List<String> userIds, String userAlias, JsonObject params) {
        if (userIds == null || userIds.isEmpty()) return "";

        params.put(Field.USERIDS, userIds);
        String columnId = userAlias != null ? String.format("%s.%s", userAlias, Field.ID) : Field.ID;
        return String.format("%s IN {%s}", columnId, Field.USERIDS);
    }

    public static String matchUsersWithPreferences(String userAlias, String prefAlias) {
        return matchUsersWithPreferences(userAlias, prefAlias, null);
    }

    public static String matchUsersWithPreferences(String userAlias, String prefAlias, String userNodeComplement) {
        return String.format("MATCH (%s:UserAppConf)<-[:PREFERS]-(%s)%s", prefAlias, userAlias,
                (userNodeComplement != null ? userNodeComplement : ""));
    }

    public static String usersNodeHasRight(String right, JsonObject params) {
        params.put(Request.RIGHT, right);
        return String.format("-[:IN]->()-[:AUTHORIZED]->(:Role)-[:AUTHORIZE]->(a:Action {name: {%s}})", Request.RIGHT);
    }

    public static String matchUserPreferencesRequest(UserInfos user, JsonObject params) {
        String query = String.format("MATCH (u:User {id:{userId}})-[:PREFERS]->(uac:UserAppConf) " +
                " RETURN uac AS %s", Request.PREFERENCES);
        params.put("userId", user.getUserId());
        return query;
    }


}
