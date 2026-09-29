package fr.openent.minibadge.test;

import io.vertx.core.Handler;
import io.vertx.core.eventbus.Message;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.sql.Sql;
import org.mockito.stubbing.Answer;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.function.Function;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Fakes what the sql.persistor replies with (the shape {@code SqlResult.validResultHandler} /
 * {@code validUniqueResultHandler} consume), so a service can be driven through a whole
 * multi-statement flow with a mocked {@link Sql} — the suite has no database.
 */
public final class FakeSqlReply {

    private FakeSqlReply() {
    }

    /** A successful reply carrying {@code rows}; every row must have the same keys, in the same order. */
    public static Message<JsonObject> rows(JsonObject... rows) {
        List<JsonObject> list = Arrays.asList(rows);
        JsonArray fields = new JsonArray();
        JsonArray results = new JsonArray();
        if (!list.isEmpty()) {
            fields = new JsonArray(new ArrayList<>(list.get(0).fieldNames()));
            for (JsonObject row : list) {
                results.add(new JsonArray(new ArrayList<>(row.getMap().values())));
            }
        }
        return message(new JsonObject().put("status", "ok").put("message", "")
                .put("results", results).put("fields", fields));
    }

    public static Message<JsonObject> error(String errorMessage) {
        return message(new JsonObject().put("status", "error").put("message", errorMessage));
    }

    @SuppressWarnings("unchecked")
    public static Message<JsonObject> message(JsonObject body) {
        Message<JsonObject> message = mock(Message.class);
        when(message.body()).thenReturn(body);
        return message;
    }

    /**
     * Stubs every {@code sql.prepared(query, params, handler)} call to answer with whatever
     * {@code replyFor} returns for its query string, synchronously.
     */
    @SuppressWarnings("unchecked")
    public static void answer(Sql sql, Function<String, Message<JsonObject>> replyFor) {
        Answer<Void> answer = invocation -> {
            String query = invocation.getArgument(0);
            Handler<Message<JsonObject>> handler = invocation.getArgument(2);
            handler.handle(replyFor.apply(query));
            return null;
        };
        doAnswer(answer).when(sql).prepared(any(), any(), any(Handler.class));
    }
}
