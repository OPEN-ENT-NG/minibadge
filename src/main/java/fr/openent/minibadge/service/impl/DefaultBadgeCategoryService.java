package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.model.BadgeCategory;
import fr.openent.minibadge.repository.BadgeCategoryRepository;
import fr.openent.minibadge.service.AbstractService;
import fr.openent.minibadge.service.BadgeCategoryService;
import io.vertx.core.Future;

import java.util.List;

public class DefaultBadgeCategoryService extends AbstractService implements BadgeCategoryService {

    private static final BadgeCategoryService instance = new DefaultBadgeCategoryService();
    private DefaultBadgeCategoryService() {}
    public static BadgeCategoryService getInstance() {
        return instance;
    }

    private final BadgeCategoryRepository badgeCategoryRepository = repositories.badgeCategoryRepository();

    @Override
    public Future<List<BadgeCategory>> getBadgeCategoriesByBadgeTypeId(long badgeTypeId) {
        return badgeCategoryRepository.findByBadgeTypeId(badgeTypeId);
    }

    @Override
    public Future<List<BadgeCategory>> getAllBadgeCategories() {
        return badgeCategoryRepository.findAll();
    }

}
