package fr.openent.minibadge.repository.impl;

import fr.openent.minibadge.repository.BadgeCategoryRepository;
import fr.openent.minibadge.repository.BadgeProtagonistSettingRepository;
import fr.openent.minibadge.repository.BadgeTypeSettingRepository;

public final class RepositoryFactory {

    private static final RepositoryFactory instance = new RepositoryFactory();

    private final BadgeCategoryRepository badgeCategoryRepository;
    private final BadgeTypeSettingRepository badgeTypeSettingRepository;
    private final BadgeProtagonistSettingRepository badgeProtagonistSettingRepository;

    private RepositoryFactory() {
        this.badgeCategoryRepository = new DefaultBadgeCategoryRepository();
        this.badgeTypeSettingRepository = new DefaultBadgeTypeSettingRepository();
        this.badgeProtagonistSettingRepository = new DefaultBadgeProtagonistSettingRepository();
    }

    public static RepositoryFactory getInstance() {
        return instance;
    }

    public BadgeCategoryRepository badgeCategoryRepository() {
        return badgeCategoryRepository;
    }

    public BadgeTypeSettingRepository badgeTypeSettingRepository() {
        return badgeTypeSettingRepository;
    }

    public BadgeProtagonistSettingRepository badgeProtagonistSettingRepository() {
        return badgeProtagonistSettingRepository;
    }
}
