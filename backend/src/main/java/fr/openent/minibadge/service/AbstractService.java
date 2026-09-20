package fr.openent.minibadge.service;

import fr.openent.minibadge.repository.impl.RepositoryFactory;

public abstract class AbstractService {
    protected final RepositoryFactory repositories = RepositoryFactory.getInstance();
}
