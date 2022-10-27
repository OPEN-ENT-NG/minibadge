package fr.cgi.minibadge.core.constants;

public class EventBusConst {

    // ADDRESS
    public static final String DIRECTORY = "directory";

    //ACTIONS
    public static final String ACTION = "action";
    public static final String LIST_USERS = "list-users";

    private EventBusConst() {
        throw new IllegalStateException("Utility class");
    }
}

