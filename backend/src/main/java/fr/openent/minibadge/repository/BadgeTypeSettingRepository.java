package fr.openent.minibadge.repository;

import fr.openent.minibadge.model.BadgeTypeSetting;
import io.vertx.core.Future;

import java.util.List;
import java.util.Optional;

public interface BadgeTypeSettingRepository {
    /**
     * Find the {@link BadgeTypeSetting} that applies to the reader for a given badge type: the row
     * scoped to one of {@code structureIds} when it exists, otherwise the centralized one
     * ({@code structure_id IS NULL}).
     * <p>
     * The query is explicitly narrowed to a single row ({@code ORDER BY ... LIMIT 1}); without it,
     * a badge type carrying both a centralized and a structure row would feed two rows into
     * {@code validUniqueResultHandler}, whose "unique" contract no longer holds.
     *
     * @param badgeTypeId  the ID of the badge type
     * @param structureIds the reader's structures; may be null or empty, in which case only the
     *                     centralized row is considered.
     * @return a Future containing an Optional with the BadgeTypeSetting if found, or empty if not found
     */
    Future<Optional<BadgeTypeSetting>> findByBadgeTypeId(long badgeTypeId, List<String> structureIds);
}
