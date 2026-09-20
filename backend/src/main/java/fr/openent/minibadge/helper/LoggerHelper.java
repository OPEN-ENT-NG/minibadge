package fr.openent.minibadge.helper;

import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;

import static fr.openent.minibadge.core.constants.Field.MINIBADGE;

public class LoggerHelper {

    public static String getBaseLog(Object classObject, String methodName) {
        return String.format("[%s@%s::%s]", MINIBADGE, classObject.getClass().getSimpleName(), methodName);
    }

    public static String getCompleteLog(Object classObject, String methodName, String message) {
        return String.format("%s %s", getBaseLog(classObject, methodName), message);
    }

    public static Logger getLogger(Class<?> myClass) {
        return LoggerFactory.getLogger(myClass);
    }

    public static void logError(Object classObject, String methodName, String message) {
        Class<?> myClass = classObject.getClass();
        getLogger(myClass).error(String.format("%s %s", getBaseLog(myClass, methodName), message));
    }

    public static void logError(Object classObject, String methodName, String message, String err) {
        Class<?> myClass = classObject.getClass();
        getLogger(myClass).error(String.format("%s %s : %s", getBaseLog(myClass, methodName), message, err));
    }

    public static void logInfo(Object classObject, String methodName, Object object) {
        logInfo(classObject, methodName, object.toString());
    }

    public static void logInfo(Object classObject, String methodName, String message) {
        Class<?> myClass = classObject.getClass();
        getLogger(myClass).info(String.format("%s %s", getBaseLog(myClass, methodName), message));
    }

    public static void logWarn(Object classObject, String methodName, String message) {
        Class<?> myClass = classObject.getClass();
        String completeLog = getCompleteLog(myClass, methodName, message);
        getLogger(myClass).warn(completeLog);
    }
}
