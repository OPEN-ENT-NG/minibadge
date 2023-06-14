package fr.openent.minibadge.helper;

import fr.openent.minibadge.model.Model;
import fr.wseduc.webutils.Either;
import io.vertx.core.Handler;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;

import java.lang.reflect.InvocationTargetException;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

public class ModelHelper {
    private static final List<Class<?>> validJsonClasses = Arrays.asList(String.class, boolean.class, Boolean.class,
            double.class, Double.class, float.class, Float.class, Integer.class, int.class, CharSequence.class,
            JsonObject.class, JsonArray.class, Long.class, long.class);
    private static final Logger log = LoggerFactory.getLogger(ModelHelper.class);

    private ModelHelper() {
        throw new IllegalStateException("Utility class");
    }

    public static <T extends Model<T>> List<T> toList(JsonArray results, Class<T> modelClass) {
        return results.stream()
                .filter(JsonObject.class::isInstance)
                .map(JsonObject.class::cast)
                .map(model -> toModel(model, modelClass))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(Collectors.toList());
    }

    public static JsonArray toJsonArray(List<? extends Model<?>> dataList) {
        return new JsonArray(dataList.stream().map(Model::toJson).collect(Collectors.toList()));
    }

    /**
     * Generic convert a list of {@link Object} to {@link JsonArray}.
     * Classes that do not implement any {@link #validJsonClasses} class or model implementation will be ignored.
     * Except {@link List} and {@link Enum}
     *
     * @param objects List of object
     * @return {@link JsonArray}
     */
    private static JsonArray listToJsonArray(List<?> objects) {
        JsonArray res = new JsonArray();
        objects.stream()
                .filter(Objects::nonNull)
                .forEach(object -> {
                    if (object instanceof Model) {
                        res.add(((Model<?>) object).toJson());
                    } else if (validJsonClasses.stream().anyMatch(aClass -> aClass.isInstance(object))) {
                        res.add(object);
                    } else if (object instanceof Enum) {
                        res.add((Enum) object);
                    } else if (object instanceof List) {
                        res.add(listToJsonArray(((List<?>) object)));
                    }
                });
        return res;
    }

    /**
     * See {@link #sqlResultToModel(Promise, Class, String)}
     */
    public static <T extends Model<T>> Handler<Either<String, JsonArray>> sqlResultToModel(Promise<List<T>> promise,
                                                                                           Class<T> modelClass) {
        return sqlResultToModel(promise, modelClass, null);
    }

    /**
     * Complete a promise from the result of a sql query, while converting this result into a list of model.
     *
     * @param promise      the promise we want to complete
     * @param modelClass   the class of the model we want to convert
     * @param errorMessage a message logged when the sql query fail
     * @param <T>          the type of the model
     */
    public static <T extends Model<T>> Handler<Either<String, JsonArray>> sqlResultToModel(Promise<List<T>> promise,
                                                                                           Class<T> modelClass,
                                                                                           String errorMessage) {
        return event -> {
            if (event.isRight()) {
                promise.complete(toList(event.right().getValue(), modelClass));
                return;
            }
            log.error(String.format("%s %s", (errorMessage != null ? errorMessage : ""), event.left().getValue()));
            promise.fail(errorMessage != null ? errorMessage : event.left().getValue());
        };
    }

    /**
     * See {@link #sqlUniqueResultToModel(Promise, Class, String)}
     */
    public static <T extends Model<T>> Handler<Either<String, JsonObject>> sqlUniqueResultToModel(Promise<Optional<T>> promise,
                                                                                                  Class<T> modelClass) {
        return sqlUniqueResultToModel(promise, modelClass, null);
    }

    /**
     * Complete a promise from the result of a sql query, while converting this result into a model.
     *
     * @param promise      the promise we want to complete
     * @param modelClass   the class of the model we want to convert
     * @param errorMessage a message logged when the sql query fail
     * @param <T>          the type of the model
     */
    public static <T extends Model<T>> Handler<Either<String, JsonObject>> sqlUniqueResultToModel(Promise<Optional<T>> promise,
                                                                                                  Class<T> modelClass,
                                                                                                  String errorMessage) {
        return event -> {
            if (event.isRight()) {
                promise.complete(event.right().getValue().isEmpty() ? Optional.empty() : toModel(event.right().getValue(), modelClass));
                return;
            }
            log.error(String.format("%s %s", (errorMessage != null ? errorMessage : ""), event.left().getValue()));
            promise.fail(errorMessage != null ? errorMessage : event.left().getValue());
        };
    }

    public static <T extends Model<T>> Optional<T> toModel(JsonObject model, Class<T> modelClass) {
        try {
            return Optional.of(modelClass.getConstructor(JsonObject.class).newInstance(model));
        } catch (NoSuchMethodException | InstantiationException | IllegalAccessException |
                 InvocationTargetException e) {
            return Optional.empty();
        }
    }
}