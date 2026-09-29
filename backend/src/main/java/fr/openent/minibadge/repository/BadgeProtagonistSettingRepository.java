package fr.openent.minibadge.repository;

import fr.openent.minibadge.model.BadgeProtagonistSettingRow;
import io.vertx.core.Future;

import java.util.List;

public interface BadgeProtagonistSettingRepository {
    /**
     * Retrieves the {@code badge_protagonist_setting} rows for a given badge type, joined through
     * the single {@code badge_type_setting} row that applies to the reader: the row scoped to one
     * of {@code structureIds} when it exists, otherwise the centralized one
     * ({@code structure_id IS NULL}).
     * <p>
     * Reading only the centralized row (the Epic A behaviour) would make a badge type created by
     * a structure — whose setting row necessarily carries that {@code structure_id}, because of the
     * {@code unique_structure_type} constraint — look completely unconfigured, silently falling back
     * to the hardcoded Student-&gt;Student relation.
     *
     * @param badgeTypeId  The ID of the badge type for which the protagonist settings are to be retrieved.
     * @param structureIds The reader's structures; may be null or empty, in which case only the
     *                     centralized row is considered.
     * @return A Future containing the raw protagonist setting rows (empty list if none seeded).
     */
    Future<List<BadgeProtagonistSettingRow>> findByBadgeTypeId(long badgeTypeId, List<String> structureIds);
}
