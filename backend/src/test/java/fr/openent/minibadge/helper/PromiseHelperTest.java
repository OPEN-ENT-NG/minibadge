package fr.openent.minibadge.helper;

import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.core.constants.Request;
import fr.openent.minibadge.model.TestModel;
import fr.wseduc.webutils.Either;
import io.vertx.core.Handler;
import io.vertx.core.Promise;
import io.vertx.core.eventbus.Message;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.unit.junit.VertxUnitRunner;
import org.junit.Assert;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mockito;

import java.util.List;
import java.util.Optional;

@RunWith(VertxUnitRunner.class)
public class PromiseHelperTest {
    private static final JsonArray TEST_ARRAY = new JsonArray()
            .add(new JsonObject().put(Field.ID, 1))
            .add(new JsonObject().put(Field.ID, 2));

    @Test
    public void testHandlerJsonArrayModelled() {
        Promise<List<TestModel>> promise = Promise.promise();
        Handler<Either<String, JsonArray>> handler = PromiseHelper.handlerJsonArrayModelled(promise, TestModel.class, "Error");
        handler.handle(new Either.Right<>(TEST_ARRAY));
        Assert.assertTrue(promise.future().succeeded());
        Assert.assertEquals(2, promise.future().result().stream().filter(test -> test.id() == 1 || test.id() == 2)
                .distinct()
                .count());
    }

    @Test
    public void testHandlerModelledWithJsonObject() {
        Promise<Optional<TestModel>> promise = Promise.promise();
        Handler<Either<String, JsonObject>> handler = PromiseHelper.handlerJsonObjectModelled(promise, TestModel.class, "Error");
        Either<String, JsonObject> result = new Either.Right<>(TEST_ARRAY.getJsonObject(0));
        handler.handle(result);
        Assert.assertTrue(promise.future().succeeded());
        Assert.assertTrue(promise.future().result().isPresent());
        promise.future().result().ifPresent(testModel -> Assert.assertEquals(1L, (long) testModel.id()));
    }

    @Test
    public void testHandlerJsonArrayModelledFailed() {
        Promise<List<TestModel>> promise = Promise.promise();
        Handler<Either<String, JsonArray>> handler = PromiseHelper.handlerJsonArrayModelled(promise, TestModel.class, "Error");
        Either<String, JsonArray> result = new Either.Left<>("An error occurred.");
        handler.handle(result);
        Assert.assertTrue(promise.future().failed());
        Assert.assertEquals("Error", promise.future().cause().getMessage());
    }

    @Test
    public void testHandlerJsonObjectModelledFailed() {
        Promise<Optional<TestModel>> promise = Promise.promise();
        Handler<Either<String, JsonObject>> handler = PromiseHelper.handlerJsonObjectModelled(promise, TestModel.class, "Error");
        Either<String, JsonObject> result = new Either.Left<>("An error occurred.");
        handler.handle(result);
        Assert.assertTrue(promise.future().failed());
        Assert.assertEquals("Error", promise.future().cause().getMessage());
    }

    @Test
    public void testValidResultHandlerSuccess() {
        Message<JsonObject> message = Mockito.mock(Message.class);
        Promise<Void> promise = Mockito.mock(Promise.class);
        JsonObject successMessage = new JsonObject().put(Request.STATUS, Request.OK);
        Mockito.when(message.body()).thenReturn(successMessage);
        Handler<Message<JsonObject>> resultHandler = PromiseHelper.validResultHandler(promise, Request.MESSAGE);
        resultHandler.handle(message);
        Mockito.verify(promise).complete();
        Mockito.verifyNoMoreInteractions(promise);
    }

    @Test
    public void testValidResultHandlerFailure() {
        Message<JsonObject> message = Mockito.mock(Message.class);
        Promise<Void> promise = Mockito.mock(Promise.class);
        JsonObject failureMessage = new JsonObject().put(Request.STATUS, Request.ERROR).put(Request.MESSAGE,
                "Something went wrong");
        Mockito.when(message.body()).thenReturn(failureMessage);
        Handler<Message<JsonObject>> resultHandler = PromiseHelper.validResultHandler(promise, Request.MESSAGE);
        resultHandler.handle(message);
    }
}