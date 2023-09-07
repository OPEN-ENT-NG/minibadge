package fr.openent.minibadge.helper;

import fr.openent.minibadge.core.constants.Request;
import fr.openent.minibadge.model.Model;
import fr.wseduc.webutils.Either;
import io.vertx.core.*;
import io.vertx.core.eventbus.Message;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.impl.CompositeFutureImpl;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;

import java.util.List;
import java.util.Optional;

public class PromiseHelper {
    private static final Logger log = LoggerFactory.getLogger(PromiseHelper.class);

    private PromiseHelper() {
        throw new IllegalStateException("Utility class");
    }

    public static <R> Handler<Either<String, R>> handler(Promise<R> promise) {
        return handler(promise, null);
    }

    public static <R> Handler<Either<String, R>> handler(Promise<R> promise, String errorMessage) {
        return handler(promise, null, errorMessage);
    }

    public static <R> Handler<Either<String, R>> handler(Promise<R> promise, HttpServerRequest request, String errorMessage) {
        return event -> {
            if (request != null) request.resume();
            if (event.isRight()) {
                promise.complete(event.right().getValue());
                return;
            }
            fail(promise, errorMessage, event.left().getValue());
        };
    }

    /**
     * transform JsonArray from Message result to a list of modelled object
     *
     * @param promise on which we want to return result
     * @param clazz that will type each occurrence in JsonArray list
     * @param errorMessage error message if failure happen
     * @return List of modelled object
     * @param <T> class type representing a model
     */
    public static <T extends Model<T>> Handler<Either<String, JsonArray>> handlerJsonArrayModelled(Promise<List<T>> promise,
                                                                                                   Class<T> clazz,
                                                                                                   String errorMessage) {
        return event -> {
            if (event.isRight()) {
                promise.complete(ModelHelper.toList(event.right().getValue(), clazz));
                return;
            }
            fail(promise, errorMessage, event.left().getValue());
        };
    }

    /**
     * transform JsonObject from Message result to a modelled object
     *
     * @param promise on which we want to return result
     * @param clazz that will type the occurrence of JsonObject
     * @param errorMessage error message if failure happen
     * @return modelled object
     * @param <T> class type representing a model
     */
    public static <T extends Model<T>> Handler<Either<String, JsonObject>> handlerJsonObjectModelled(Promise<Optional<T>> promise,
                                                                                                     Class<T> clazz,
                                                                                                     String errorMessage) {
        return event -> {
            if (event.isRight()) {
                promise.complete(ModelHelper.toModel(event.right().getValue(), clazz));
                return;
            }
            fail(promise, errorMessage, event.left().getValue());
        };
    }


    /**
     * function to log error and responding failure to the concerned promise
     *
     * @param promise      promise to respond failure
     * @param errorMessage error concerning the feature
     * @param errorValue   technical error generated
     */
    public static void fail(Promise<?> promise, String errorMessage, String errorValue) {
        log.error(String.format("%s %s", (errorMessage != null ? errorMessage : ""), errorValue));
        promise.fail(errorMessage != null ? errorMessage : errorValue);
    }

    public static <R> Handler<AsyncResult<Message<JsonObject>>> messageHandler(Promise<R> promise) {
        return messageHandler(promise, null);
    }

    public static Handler<Message<JsonObject>> messageToPromise(Promise<Void> promise) {
        return event -> {
            if (event.body().getString(Request.STATUS).equals(Request.OK)) {
                promise.complete();
            } else {
                log.error(String.format("%s", event.body().getString(Request.MESSAGE)));
                promise.fail(event.body().getString(Request.MESSAGE));
            }
        };
    }


    @SuppressWarnings("unchecked")
    public static <R> Handler<AsyncResult<Message<JsonObject>>> messageHandler(Promise<R> promise, String errorMessage) {
        return event -> {
            if (event.succeeded() && Request.OK.equals(event.result().body().getString(Request.STATUS)))
                promise.complete((R) event.result().body().getValue(Request.RESULT,
                        event.result().body().getValue(Request.RESULTS)));
            else if (event.failed()) fail(promise, errorMessage, event.cause().getMessage());
            else fail(promise, errorMessage, event.result().body().getString(Request.MESSAGE));
        };
    }

    /**
     * complete void Promise from JsonObject Message result
     *
     * @param promise to answer on
     * @param message failure message
     * @return JsonObject message result.
     */
    public static Handler<Message<JsonObject>> validResultHandler(Promise<Void> promise, final String message) {
        return event -> {
            JsonObject body = event.body();
            if (Request.OK.equals(body.getString(Request.STATUS))) {
                promise.complete();
                return;
            }
            fail(promise, message, body.getString(Request.MESSAGE));
        };
    }

    public static <T> CompositeFuture all(List<Future<T>> futures) {
        return CompositeFutureImpl.all(futures.toArray(new Future[futures.size()]));
    }
}
