package fr.openent.minibadge.service;

import fr.openent.minibadge.model.BadgeTypeSetting;
import io.vertx.core.Future;

import java.util.List;
import java.util.Optional;

public interface BadgeTypeSettingService {
    /**
     * Check if a badge type is self-assignable.
     * @param badgeTypeId  the ID of the badge type
     * @param structureIds the reader's structures, so a structure-scoped setting row wins over the
     *                     centralized one (see {@link fr.openent.minibadge.repository.BadgeTypeSettingRepository})
     * @return a Future that will complete with true if the badge type is self-assignable, false otherwise
     */
    Future<Boolean> isBadgeTypeSelfAssignable(Long badgeTypeId, List<String> structureIds);

    /**
     * The badge_type_setting row that applies to the reader (structure row first, centralized one
     * otherwise — same precedence as {@link #isBadgeTypeSelfAssignable}), for callers that need more than
     * one of its fields at once (e.g. {@code isSelfAssignable} AND the Epic C {@code validUntil}) without
     * querying the same row twice.
     *
     * @return the applicable setting, or empty when the badge type has none configured.
     */
    Future<Optional<BadgeTypeSetting>> findApplicableSetting(Long badgeTypeId, List<String> structureIds);
}
