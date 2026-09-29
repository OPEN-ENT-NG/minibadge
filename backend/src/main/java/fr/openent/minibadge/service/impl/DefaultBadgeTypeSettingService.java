package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.helper.LoggerHelper;
import fr.openent.minibadge.model.BadgeTypeSetting;
import fr.openent.minibadge.repository.BadgeTypeSettingRepository;
import fr.openent.minibadge.service.AbstractService;
import fr.openent.minibadge.service.BadgeTypeSettingService;
import io.vertx.core.Future;
import io.vertx.core.Promise;

import java.util.List;
import java.util.Optional;


public class DefaultBadgeTypeSettingService extends AbstractService implements BadgeTypeSettingService {

    private static final DefaultBadgeTypeSettingService instance = new DefaultBadgeTypeSettingService();

    private DefaultBadgeTypeSettingService() {}

    public static DefaultBadgeTypeSettingService getInstance() {
        return instance;
    }

    private final BadgeTypeSettingRepository badgeTypeSettingRepository = repositories.badgeTypeSettingRepository();

    @Override
    public Future<Boolean> isBadgeTypeSelfAssignable(Long badgeTypeId, List<String> structureIds) {
        Promise<Boolean> promise = Promise.promise();

        badgeTypeSettingRepository.findByBadgeTypeId(badgeTypeId, structureIds)
                .onSuccess(optionalSetting -> {
                    if (optionalSetting.isPresent()) {
                        promise.complete(optionalSetting.get().getIsSelfAssignable());
                    } else {
                        promise.complete(false); // Default to false if no setting found
                    }
                })
                .onFailure(err -> {
                    String errorMessage = "Error retrieving badge type setting for badgeTypeId: " + badgeTypeId;
                    LoggerHelper.logError(this, "isBadgeTypeSelfAssignable", errorMessage, err.getMessage());
                    promise.fail(err);
                });

        return promise.future();
    }

    @Override
    public Future<Optional<BadgeTypeSetting>> findApplicableSetting(Long badgeTypeId, List<String> structureIds) {
        return badgeTypeSettingRepository.findByBadgeTypeId(badgeTypeId, structureIds)
                .onFailure(err -> LoggerHelper.logError(this, "findApplicableSetting",
                        "Error retrieving badge type setting for badgeTypeId: " + badgeTypeId, err.getMessage()));
    }
}
