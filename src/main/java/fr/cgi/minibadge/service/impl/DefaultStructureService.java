package fr.cgi.minibadge.service.impl;

import fr.cgi.minibadge.core.constants.Field;
import fr.cgi.minibadge.helper.PromiseHelper;
import fr.cgi.minibadge.model.Structure;
import fr.cgi.minibadge.service.StructureService;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.neo4j.Neo4j;
import org.entcore.common.neo4j.Neo4jResult;

import java.util.List;

public class DefaultStructureService implements StructureService {
    private final Neo4j neo;

    public DefaultStructureService(Neo4j neo) {
        this.neo = neo;
    }

    @Override
    public Future<List<Structure>> getStructures(List<String> structureIds) {
        Promise<List<Structure>> promise = Promise.promise();
        getStructuresRequest(structureIds)
                .onFailure(promise::fail)
                .onSuccess(structures -> promise.complete(new Structure().toList(structures)));
        return promise.future();
    }

    private Future<JsonArray> getStructuresRequest(List<String> structureIds) {
        Promise<JsonArray> promise = Promise.promise();

        String query = String.format(" MATCH (s:Structure) WHERE s.id IN {%s} RETURN s.id as id, s.name as name",
                Field.STRUCTUREIDS);

        JsonObject params = new JsonObject()
                .put(Field.STRUCTUREIDS, structureIds);
        neo.execute(query, params, Neo4jResult.validResultHandler(PromiseHelper.handler(promise,
                String.format("[Minibadge@%s::getStructuresRequest] Fail to get structures",
                        this.getClass().getSimpleName()))));

        return promise.future();
    }
}
