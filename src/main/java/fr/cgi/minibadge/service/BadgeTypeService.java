package fr.cgi.minibadge.service;

import fr.cgi.minibadge.model.BadgeType;
import io.vertx.core.Future;
import io.vertx.core.http.HttpServerRequest;

import java.util.List;

public interface BadgeTypeService {

    /**
     * Get list of general / structure based badge types
     *
     * @param structureIds Structure identifiers
     * @param limit max number of occurrences
     * @param offset position from where getting occurrences
     * @return return list of badge type (model)
     */
    Future<List<BadgeType>> getBadgeTypes(List<String> structureIds, String query, int limit, Integer offset);

    /**
     * Get badge type
     *
     * @param structureIds Structure identifiers
     * @param typeId Structure identifier
     * @param host Host
     * @param language accepted language
     * @return return list of badge type (model)
     */
    Future<BadgeType> getBadgeType(List<String> structureIds, long typeId, String host, String language);
}
