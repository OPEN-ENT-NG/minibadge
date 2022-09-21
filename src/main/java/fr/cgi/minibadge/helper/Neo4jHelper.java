package fr.cgi.minibadge.helper;

import fr.cgi.minibadge.core.constants.Request;
import io.vertx.core.json.JsonObject;
import org.apache.commons.lang3.StringUtils;

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
}
