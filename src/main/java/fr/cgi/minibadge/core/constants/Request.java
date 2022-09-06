package fr.cgi.minibadge.core.constants;

public class Request {
    public static final String ALL = "all";
    public static final String OFFSET = "offset";
    public static final String LIMIT = "limit";
    public static final String QUERY = "query";
    public static final String PAGESIZE = "pageSize";
    public static final String MESSAGE = "message";

    private Request() {
        throw new IllegalStateException("Utility class");
    }
}

