package fr.cgi.minibadge.helper;

import io.vertx.core.json.JsonArray;
import org.apache.commons.lang3.StringUtils;
import org.entcore.common.sql.Sql;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public class SqlHelper {
    private SqlHelper() {
        throw new IllegalStateException("Utility class");
    }

    public static String filterStructures(List<String> structureIds, JsonArray params) {
        if (structureIds == null || structureIds.isEmpty()) return "";

        params.addAll(new JsonArray(structureIds));
        return String.format("structure_id IN %s", Sql.listPrepared(structureIds));
    }

    public static String addLimitOffset(Integer limit, Integer offset, JsonArray params) {
        String query = "";
        if (limit != null) {
            query += " LIMIT ? ";
            params.add(limit);
        }

        if (offset != null) {
            query += " OFFSET ? ";
            params.add(offset);
        }

        return query;
    }


    public static String searchQueryInColumns(String query, List<String> columns, JsonArray params) {
        if (query == null || query.isEmpty()) return "";

        List<String> queryPieces = Arrays.stream(query.toLowerCase().split("\\s*,\\s*"))
                .map(queryPiece -> String.format("%%%s%%", StringUtils.stripAccents(queryPiece)))
                .collect(Collectors.toList());

        return String.format(" (%s) ",
                columns.stream().map(column -> {
                            params.addAll(new JsonArray(queryPieces));
                            return queryPieces.stream()
                                    .map(queryPiece -> String.format("LOWER(UNACCENT(%s)) LIKE ALL %s", column, Sql.arrayPrepared(queryPieces.toArray(), true)))
                                    .collect(Collectors.joining(" OR "));
                        })
                        .collect(Collectors.joining(" OR "))
        );
    }
}
