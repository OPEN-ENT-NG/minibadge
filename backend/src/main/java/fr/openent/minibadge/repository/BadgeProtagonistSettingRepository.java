package fr.openent.minibadge.repository;

import fr.openent.minibadge.model.BadgeProtagonistSettingRow;
import io.vertx.core.Future;

import java.util.List;

public interface BadgeProtagonistSettingRepository {
    /**
     * Retrieves the centralized (structure_id IS NULL) badge_protagonist_setting rows for a
     * given badge type, joined through badge_type_setting. Never reads a structure-specific row:
     * this configuration is centralized only.
     *
     * @param badgeTypeId The ID of the badge type for which the protagonist settings are to be retrieved.
     * @return A Future containing the raw protagonist setting rows (empty list if none seeded).
     */
    Future<List<BadgeProtagonistSettingRow>> findByBadgeTypeId(long badgeTypeId);
}
