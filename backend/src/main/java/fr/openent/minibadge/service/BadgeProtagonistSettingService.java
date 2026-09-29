package fr.openent.minibadge.service;

import fr.openent.minibadge.model.TypeSetting;
import io.vertx.core.Future;

public interface BadgeProtagonistSettingService {
    /**
     * Builds the authorized assignor -> receiver relations for a given badge type, reading the
     * centralized {@code badge_protagonist_setting} configuration (SENDER_PROFILE x TARGET_PROFILE
     * cartesian product). Falls back to {@link fr.openent.minibadge.helper.SettingHelper#getDefaultTypeSetting()}
     * when no usable row is seeded for this badge type (backward compatibility) instead of failing
     * or returning an empty/broken relation set.
     * <p>
     * Only the {@code relations} of the returned {@link TypeSetting} are populated by this method —
     * {@code isSelfAssignable} and {@code structureId} are set separately by callers, exactly like the
     * previous {@code SettingHelper.getDefaultTypeSetting()} call sites did.
     *
     * @param badgeTypeId The ID of the badge type for which the relations are to be retrieved.
     * @return A Future containing the resolved TypeSetting (relations only).
     */
    Future<TypeSetting> getRelationsSetting(long badgeTypeId);
}
