package fr.openent.minibadge.repository.impl;

import fr.openent.minibadge.repository.BadgeCategoryRepository;
import org.entcore.common.neo4j.Neo4j;
import org.entcore.common.sql.Sql;

public class RepositoryFactory {

    private final Sql sql;
    private final Neo4j neo4j;

    private final BadgeCategoryRepository badgeCategoryRepository;

    public RepositoryFactory(Sql sql, Neo4j neo4j) {
        this.sql = sql;
        this.neo4j = neo4j;

        this.badgeCategoryRepository = new DefaultBadgeCategoryRepository(this);
    }

    public Sql sql() {
        return sql;
    }

    public Neo4j neo4j() {
        return neo4j;
    }

    public BadgeCategoryRepository badgeCategoryRepository() {
        return badgeCategoryRepository;
    }
}
