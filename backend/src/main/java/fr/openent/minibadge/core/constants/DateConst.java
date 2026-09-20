package fr.openent.minibadge.core.constants;

public class DateConst {
    public static final String DAY = "day";
    public static final String DAY_MONTH_YEAR_KEBAB = "YYYY-MM-DD";
    public static final String DATE_FORMAT = "yyyy-MM-dd";
    public static final String DATE_TIME_FORMAT = "yyyy-MM-dd HH:mm";
    public static final String DATE_TIME_FORMAT_2 = "yyyy-MM-dd HH:mm:ss";
    public static final String TIME_FORMAT = "HH:mm";
    public static final String TIME_FORMAT_2 = "HH:mm:ss";
    public static final String DB_DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSS";

    private DateConst() {
        throw new IllegalStateException("Utility class");
    }
}

