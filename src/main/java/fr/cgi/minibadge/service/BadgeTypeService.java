package fr.cgi.minibadge.service;

import fr.cgi.minibadge.model.BadgeType;
import io.vertx.core.Future;

import java.util.List;

public interface BadgeTypeService {

    /**
     * Get list of general / structure based badge types
     *
     * @param structureId Structure identifier
     * @param limit max number of occurrences
     * @param offset position from where getting occurrences
     * @return return list of badge type (model)
     */
    Future<List<BadgeType>> getBadgeTypes(String structureId, String query, int limit, Integer offset);
}
