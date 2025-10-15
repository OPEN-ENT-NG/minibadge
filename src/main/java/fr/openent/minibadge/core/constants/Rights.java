package fr.openent.minibadge.core.constants;

import fr.openent.minibadge.controller.FakeRight;

public class Rights {
    public static final String ASSIGN = "minibadge.assign";
    public static final String FULLNAME_ASSIGN = String.format("%s.%s|assign", FakeRight.class.getPackage().getName(),
            FakeRight.class.getSimpleName());
    public static final String RECEIVE = "minibadge.receive";
    public static final String FULLNAME_RECEIVE = String.format("%s.%s|receive", FakeRight.class.getPackage().getName(),
            FakeRight.class.getSimpleName());
    public static final String VIEW = "minibadge.view";
    public static final String STATISTICS_VIEW = "minibadge.statistics.view";
    public static final String STATISTICS_VIEW_ALL = "minibadge.statistics.view.all";

    private Rights() {
        throw new IllegalStateException("Utility class");
    }
}

