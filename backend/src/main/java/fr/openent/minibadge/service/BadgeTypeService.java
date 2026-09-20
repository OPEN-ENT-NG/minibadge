package fr.openent.minibadge.service;

import fr.openent.minibadge.model.BadgeType;
import io.vertx.core.Future;
import org.entcore.common.user.UserInfos;

import java.util.List;

public interface BadgeTypeService {

    /**
     * Get list of general / structure based badge types
     *
     * @param structureIds Structure identifiers
     * @param limit        max number of occurrences
     * @param offset       position from where getting occurrences
     * @param query        search query
     * @param badgeCategoryId filter on badge category id
     * @return return list of badge type (model)
     */
    Future<List<BadgeType>> getBadgeTypes(List<String> structureIds, String query, int limit, Integer offset, Long badgeCategoryId);

    /**
     * Get badge type
     *
     * @param userInfos    User information
     * @param typeId       Type identifier
     * @param host         Host
     * @param language     accepted language
     * @return return list of badge type (model)
     */
    Future<BadgeType> getBadgeType(UserInfos userInfos, long typeId, String host, String language);
}
