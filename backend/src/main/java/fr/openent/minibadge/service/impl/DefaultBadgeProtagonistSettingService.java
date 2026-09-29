package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.helper.LoggerHelper;
import fr.openent.minibadge.helper.SettingHelper;
import fr.openent.minibadge.model.BadgeProtagonistSetting;
import fr.openent.minibadge.model.BadgeProtagonistSettingRelation;
import fr.openent.minibadge.model.BadgeProtagonistSettingRow;
import fr.openent.minibadge.model.TypeSetting;
import fr.openent.minibadge.repository.BadgeProtagonistSettingRepository;
import fr.openent.minibadge.service.AbstractService;
import fr.openent.minibadge.service.BadgeProtagonistSettingService;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonObject;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class DefaultBadgeProtagonistSettingService extends AbstractService implements BadgeProtagonistSettingService {

    private static final BadgeProtagonistSettingService instance = new DefaultBadgeProtagonistSettingService();
    private DefaultBadgeProtagonistSettingService() {}
    public static BadgeProtagonistSettingService getInstance() {
        return instance;
    }

    private final BadgeProtagonistSettingRepository badgeProtagonistSettingRepository = repositories.badgeProtagonistSettingRepository();

    @Override
    public Future<TypeSetting> getRelationsSetting(long badgeTypeId) {
        Promise<TypeSetting> promise = Promise.promise();

        badgeProtagonistSettingRepository.findByBadgeTypeId(badgeTypeId)
                .onSuccess(rows -> promise.complete(buildTypeSetting(rows)))
                .onFailure(err -> {
                    String errorMessage = "Error retrieving badge protagonist settings for badgeTypeId: " + badgeTypeId;
                    LoggerHelper.logError(this, "getRelationsSetting", errorMessage, err.getMessage());
                    promise.fail(err);
                });

        return promise.future();
    }

    /**
     * Groups the raw rows by protagonist_type (SENDER_PROFILE forms the authorized assignor set,
     * TARGET_PROFILE the authorized receiver set - *_AUDIENCE rows are ignored for this scope, see
     * the plan's "NOT Building" section) and builds their cartesian product as relations. Falls back
     * to the hardcoded Student->Student default when no rows are seeded, or when a seeded badge type
     * setting is missing either side of the relation (defensive: never return an empty/broken relation
     * set for a badge type that should have one).
     */
    private TypeSetting buildTypeSetting(List<BadgeProtagonistSettingRow> rows) {
        if (rows == null || rows.isEmpty()) {
            return SettingHelper.getDefaultTypeSetting();
        }

        List<BadgeProtagonistSetting> assignors = toProtagonistSettings(rows, Field.SENDER_PROFILE);
        List<BadgeProtagonistSetting> receivers = toProtagonistSettings(rows, Field.TARGET_PROFILE);

        if (assignors.isEmpty() || receivers.isEmpty()) {
            return SettingHelper.getDefaultTypeSetting();
        }

        List<BadgeProtagonistSettingRelation> relations = new ArrayList<>();
        for (BadgeProtagonistSetting assignor : assignors) {
            for (BadgeProtagonistSetting receiver : receivers) {
                relations.add(new BadgeProtagonistSettingRelation(assignor, receiver));
            }
        }

        return new TypeSetting(relations);
    }

    private List<BadgeProtagonistSetting> toProtagonistSettings(List<BadgeProtagonistSettingRow> rows, String protagonistType) {
        return rows.stream()
                .filter(row -> protagonistType.equals(row.protagonistType()))
                .map(row -> new BadgeProtagonistSetting(
                        new JsonObject()
                                .put(Field.TYPE, Field.PROFILE)
                                .put(Field.TYPEVALUE, row.protagonistTypeId())
                                .put(Field.LABEL, row.protagonistTypeId())
                ))
                .collect(Collectors.toList());
    }
}
