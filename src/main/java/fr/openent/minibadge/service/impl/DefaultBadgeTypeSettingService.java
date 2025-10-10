package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.repository.BadgeTypeSettingRepository;
import fr.openent.minibadge.service.AbstractService;
import fr.openent.minibadge.service.BadgeTypeSettingService;
import io.vertx.core.Future;
import io.vertx.core.Promise;


public class DefaultBadgeTypeSettingService extends AbstractService implements BadgeTypeSettingService {

    private static final DefaultBadgeTypeSettingService instance = new DefaultBadgeTypeSettingService();

    private DefaultBadgeTypeSettingService() {}

    public static DefaultBadgeTypeSettingService getInstance() {
        return instance;
    }

    private final BadgeTypeSettingRepository badgeTypeSettingRepository = repositories.badgeTypeSettingRepository();

    @Override
    public Future<Boolean> isBadgeTypeSelfAssignable(Long badgeTypeId) {
        Promise<Boolean> promise = Promise.promise();

        badgeTypeSettingRepository.findByBadgeTypeId(badgeTypeId)
                .onSuccess(optionalSetting -> {
                    if (optionalSetting.isPresent()) {
                        promise.complete(optionalSetting.get().getIsSelfAssignable());
                    } else {
                        promise.complete(false); // Default to false if no setting found
                    }
                })
                .onFailure(promise::fail);

        return promise.future();
    }
}
