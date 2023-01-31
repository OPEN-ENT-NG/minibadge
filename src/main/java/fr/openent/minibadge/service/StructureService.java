package fr.openent.minibadge.service;

import fr.openent.minibadge.model.Structure;
import io.vertx.core.Future;

import java.util.List;

public interface StructureService {
    /**
     * get structures from ids
     *
     * @param structureId structure identifiers
     * @return return future containing list of structures
     */
    Future<List<Structure>> getStructures(List<String> structureId);
}
