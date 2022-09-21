package fr.cgi.minibadge.service;

import io.vertx.core.Future;

import java.util.List;

public interface BadgeService {
    /**
     * Creates badges if not exists
     *
     * @param typeId type identifier
     * @param ownerIds badge owner identifiers
     * @return return future
     */
    Future<Void> createBadges(long typeId, List<String> ownerIds);
}
