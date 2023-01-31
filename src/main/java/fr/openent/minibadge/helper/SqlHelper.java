package fr.openent.minibadge.helper;

import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.model.ThresholdSetting;
import fr.openent.minibadge.service.impl.DefaultBadgeAssignedService;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.apache.commons.lang3.StringUtils;
import org.entcore.common.sql.Sql;
import org.entcore.common.user.UserInfos;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public class SqlHelper {
    private SqlHelper() {
        throw new IllegalStateException("Utility class");
    }

    public static String filterStructures(List<String> structureIds, JsonArray params) {
        return filterStructures(structureIds, params, null);
    }

    public static String filterStructures(List<String> structureIds, JsonArray params, String alias) {
        if (structureIds == null || structureIds.isEmpty()) return "";

        alias = alias != null ? String.format("%s.", alias) : "";
        params.addAll(new JsonArray(structureIds));
        return String.format("%sstructure_id IN %s", alias, Sql.listPrepared(structureIds));
    }

    public static String andFilterStructures(List<String> structureIds, JsonArray params) {
        return andFilterStructures(structureIds, params, null);
    }

    public static String andFilterStructures(List<String> structureIds, JsonArray params, String alias) {
        String whereStructureIds = SqlHelper.filterStructures(structureIds, params, alias);
        return "".equals(whereStructureIds) ? "" : String.format("%s %s", "AND", whereStructureIds);
    }

    public static String filterStructuresWithNull(List<String> structureIds, JsonArray params) {
        return filterStructuresWithNull(structureIds, params, null);
    }

    public static String filterStructuresWithNull(List<String> structureIds, JsonArray params, String alias) {
        String whereStructureIds = SqlHelper.filterStructures(structureIds, params, alias);
        alias = alias != null ? String.format("%s.", alias) : "";
        return String.format("(%s %s %sstructure_id IS NULL)",
                whereStructureIds, "".equals(whereStructureIds) ? "" : "OR", alias);
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

    public static Integer getResultCount(JsonObject result) {
        return result.getInteger(Field.COUNT);
    }

    public static String getPartitionsThresholdsReachedRequests(List<ThresholdSetting> thresholdSettings, UserInfos user,
                                                                JsonArray params) {
        return thresholdSettings.stream()
                .map(badgeSetting -> {
                    String formatDate = DateHelper.getFormatFromConstant(badgeSetting.thresholdPeriodAssignable());
                    String request = String.format("((%s) >= ?)", getCTEThreshold(formatDate, user, params));
                    params.add(badgeSetting.thresholdMaxAssignable());
                    return request;
                })
                .collect(Collectors.joining(" OR "));
    }

    public static String getCTEThresholdsRequests(List<ThresholdSetting> thresholdSettings, UserInfos user, JsonArray params) {
        return thresholdSettings.stream()
                .map(badgeSetting -> {
                    String formatDate = DateHelper.getFormatFromConstant(badgeSetting.thresholdPeriodAssignable());
                    return String.format("(%s) as %s",
                            getCTEThreshold(formatDate, user, params), badgeSetting.thresholdPeriodAssignable());
                })
                .collect(Collectors.joining(", "));
    }

    public static String getCTEThreshold(String formatDate, UserInfos user, JsonArray params) {
        params.add(user.getUserId());
        return String.format("SELECT COUNT(id) FROM %s " +
                        " WHERE to_char(now(), '%s') = to_char(created_at, '%s') AND assignor_id = ?",
                DefaultBadgeAssignedService.BADGE_ASSIGNED_VALID_TABLE, formatDate, formatDate);
    }
}
