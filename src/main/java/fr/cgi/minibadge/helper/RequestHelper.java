package fr.cgi.minibadge.helper;

import fr.cgi.minibadge.Minibadge;
import fr.cgi.minibadge.core.constants.Request;
import fr.cgi.minibadge.model.Model;
import io.vertx.core.MultiMap;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;

import java.util.List;
import java.util.stream.Collectors;

public class RequestHelper {
    private RequestHelper() {
        throw new IllegalStateException("Utility class");
    }

    public static int cappingLimit(MultiMap params) {
        return Math.min(params.contains(Request.LIMIT)
                ? Integer.parseInt(params.get(Request.LIMIT))
                : Minibadge.PAGE_SIZE, Minibadge.PAGE_SIZE_MAX);
    }

    public static JsonObject formatResponse(Integer limit, Integer offset, List<? extends Model<?>> dataList) {
        return new JsonObject()
                .put(Request.LIMIT, limit)
                .put(Request.OFFSET, offset)
                .put(Request.ALL, new JsonArray(dataList.stream().map(Model::toJson).collect(Collectors.toList())));
    }
}
