package fr.openent.minibadge.core.constants;

public class EventBusConst {

    // ADDRESS
    public static final String DIRECTORY = "directory";

    //ACTIONS
    public static final String ACTION = "action";
    public static final String LIST_USERS = "list-users";

    //EVENTS
    public static final String CREATE_EVENT = "CREATE";
    public static final String ACCESS_EVENT = "ACCESS";

    private EventBusConst() {
        throw new IllegalStateException("Utility class");
    }
}

