package fr.openent.minibadge.helper;

import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.model.Model;
import fr.wseduc.webutils.Either;
import io.vertx.core.Handler;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import io.vertx.ext.unit.Async;
import io.vertx.ext.unit.TestContext;
import io.vertx.ext.unit.junit.VertxUnitRunner;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.lang.reflect.Constructor;
import org.reflections.Reflections;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static org.reflections.scanners.Scanners.SubTypes;

@RunWith(VertxUnitRunner.class)
public class ModelHelperTest {
    enum MyEnum {
        VALUE1,
        VALUE2,
        VALUE3
    }

    static class MyClass {
        public String id;
    }
    static class MyModel implements Model<MyModel> {
        public String id;
        public boolean isGood;
        public MyOtherModel otherModel;
        public MyClass myClass;
        public List<Integer> typeIdList;
        public List<MyOtherModel> otherModelList;
        public List<MyClass> myClassList;
        public List<List<JsonObject>> listList;
        public MyEnum myEnum;
        public List<MyEnum> myEnumList;
        public MyEnum nullValue = null;

        public MyModel() {
        }

        public MyModel(JsonObject jsonObject) {
            this.id = jsonObject.getString(Field.ID);
        }

        @Override
        public JsonObject toJson() {
            return null;
        }

        @Override
        public MyModel model(JsonObject model) {
            return null;
        }

        @Override
        public MyModel set(JsonObject model) {
            return null;
        }
    }

    static class MyOtherModel implements Model<MyOtherModel> {
        public String myName;

        public MyOtherModel() {
        }

        public MyOtherModel(JsonObject jsonObject) {
            this.myName = jsonObject.getString("myName");
        }

        @Override
        public JsonObject toJson() {
            return null;
        }

        @Override
        public MyOtherModel model(JsonObject model) {
            return null;
        }

        @Override
        public MyOtherModel set(JsonObject model) {
            return null;
        }
    }

    private static final Logger log = LoggerFactory.getLogger(ModelHelperTest.class);

    @Test
    public void testSubClassModel(TestContext ctx) {
        Reflections reflections = new Reflections("fr.openent.minibadge");
        List<Class<?>> ignoredClassList = Arrays.asList(MyModel.class, MyOtherModel.class);

        Set<Class<?>> subTypes =
                reflections.get(SubTypes.of(Model.class).asClass());
        List<Class<?>> invalidModel = subTypes.stream()
                .filter(modelClass -> !ignoredClassList.contains(modelClass) && !modelClass.isInterface())
                .filter(modelClass -> {
                    Constructor<?> emptyConstructor = Arrays.stream(modelClass.getConstructors())
                            .filter(constructor -> constructor.getParameterTypes().length == 1
                                    && constructor.getParameterTypes()[0].equals(JsonObject.class))
                            .findFirst()
                            .orElse(null);
                    return emptyConstructor == null;
                }).collect(Collectors.toList());

        invalidModel.forEach(modelClass -> {
            String message = String.format("[Minibadge@%s::testSubClassModel]: The class %s must have public constructor with JsonObject parameter declared",
                    this.getClass().getSimpleName(), modelClass.getSimpleName());
            log.fatal(message);
        });

        ctx.assertTrue(invalidModel.isEmpty(), "One or more Model don't have public constructor with JsonObject parameter declared. Check log above.");
    }

    @Test
    public void sqlUniqueResultToModelTest(TestContext ctx) {
        Async async = ctx.async();
        Promise<Optional<MyOtherModel>> promise = Promise.promise();

        promise.future().onSuccess(myOtherModel -> {
            ctx.assertTrue(myOtherModel.isPresent());
            ctx.assertEquals(myOtherModel.get().myName, "test");
            async.complete();
        });

        final Handler<Either<String, JsonObject>> handler = ModelHelper.sqlUniqueResultToModel(promise, MyOtherModel.class);
        handler.handle(new Either.Right<>(new JsonObject("{\"myName\":\"test\"}")));

        async.awaitSuccess(1000);
    }

    @Test
    public void sqlResultToModelTest(TestContext ctx) {
        Async async = ctx.async();
        Promise<List<MyOtherModel>> promise = Promise.promise();

        promise.future().onSuccess(myOtherModelList -> {
            ctx.assertEquals(myOtherModelList.size(), 2);
            ctx.assertEquals(myOtherModelList.get(0).myName, "test");
            ctx.assertEquals(myOtherModelList.get(1).myName, "test2");
            async.complete();
        });

        final Handler<Either<String, JsonArray>> handler = ModelHelper.sqlResultToModel(promise, MyOtherModel.class);
        handler.handle(new Either.Right<>(new JsonArray("[{\"myName\":\"test\"}, {\"myName\":\"test2\"}]")));

        async.awaitSuccess(1000);
    }

    @Test
    public void toModelTest(TestContext ctx) {
        Optional<MyModel> myModel = ModelHelper.toModel(new JsonObject().put(Field.ID, "3"), MyModel.class);
        ctx.assertTrue(myModel.isPresent());
        ctx.assertEquals(myModel.get().id, "3");

        myModel = ModelHelper.toModel(new JsonObject(), MyModel.class);
        ctx.assertTrue(myModel.isPresent());
        ctx.assertNull(myModel.get().id);

        //CastException
        myModel = ModelHelper.toModel(new JsonObject().put(Field.ID, 3), MyModel.class);
        ctx.assertFalse(myModel.isPresent());

        //NPE
        myModel = ModelHelper.toModel(null, MyModel.class);
        ctx.assertFalse(myModel.isPresent());
    }
}