package fr.openent.minibadge.repository.impl;

import fr.openent.minibadge.repository.BadgeCategoryRepository;

public final class RepositoryFactory {

    private static final RepositoryFactory instance = new RepositoryFactory();

    private final BadgeCategoryRepository badgeCategoryRepository;

    private RepositoryFactory() {
        this.badgeCategoryRepository = new DefaultBadgeCategoryRepository();
    }

    public static RepositoryFactory getInstance() {
        return instance;
    }

    public BadgeCategoryRepository badgeCategoryRepository() {
        return badgeCategoryRepository;
    }
}
