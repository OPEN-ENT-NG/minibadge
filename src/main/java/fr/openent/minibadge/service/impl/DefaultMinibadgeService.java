package fr.openent.minibadge.service.impl;

import fr.openent.minibadge.service.MinibadgeService;
import org.entcore.common.sql.Sql;

public class DefaultMinibadgeService implements MinibadgeService {

    private final Sql sql;

    public DefaultMinibadgeService(Sql sql) {
       this.sql = sql;
    }
}
