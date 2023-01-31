package fr.openent.minibadge.core.constants;

public class Request {
    public static final String ALL = "all";
    public static final String OFFSET = "offset";
    public static final String LIMIT = "limit";
    public static final String PAGE = "page";
    public static final String PAGECOUNT = "pageCount";
    public static final String QUERY = "query";
    public static final String PAGESIZE = "pageSize";
    public static final String MESSAGE = "message";
    public static final String OK = "ok";
    public static final String STATUS = "status";
    public static final String RESULT = "result";
    public static final String RESULTS = "results";
    public static final String CACHE = "cache";
    public static final String PREFERENCE = "preference";
    public static final String PREFERENCES = "preferences";
    public static final String RIGHT = "right";

    public static final String START_DATE = "startDate";
    public static final String END_DATE = "endDate";
    public static final String SORTBY = "sortBy";
    public static final String SORTASC = "sortAsc";

    private Request() {
        throw new IllegalStateException("Utility class");
    }
}

