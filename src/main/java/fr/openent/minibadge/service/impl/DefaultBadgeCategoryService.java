package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.model.entity.BadgeCategory;
import fr.openent.minibadge.repository.BadgeCategoryRepository;
import fr.openent.minibadge.repository.impl.RepositoryFactory;
import fr.openent.minibadge.service.BadgeCategoryService;
import io.vertx.core.Future;

import java.util.List;

public class DefaultBadgeCategoryService implements BadgeCategoryService {
    private final BadgeCategoryRepository badgeCategoryRepository;

    public DefaultBadgeCategoryService(RepositoryFactory repositoryFactory) {
        this.badgeCategoryRepository = repositoryFactory.badgeCategoryRepository();
    }

    @Override
    public Future<List<BadgeCategory>> getBadgeCategoriesByBadgeTypeId(long badgeTypeId) {
        return badgeCategoryRepository.findByBadgeTypeId(badgeTypeId);
    }

    @Override
    public Future<List<BadgeCategory>> getAllBadgeCategories() {
        return badgeCategoryRepository.findAll();
    }

}
