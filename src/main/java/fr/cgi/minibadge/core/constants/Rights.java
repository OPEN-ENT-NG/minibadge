package fr.cgi.minibadge.core.constants;

import fr.cgi.minibadge.controller.FakeRight;

public class Rights {
    public static final String ASSIGN = "minibadge.assign";
    public static final String FULLNAME_ASSIGN = String.format("%s.%s|assign", FakeRight.class.getPackage().getName(),
            FakeRight.class.getSimpleName());
    public static final String RECEIVE = "minibadge.receive";
    public static final String FULLNAME_RECEIVE = String.format("%s.%s|receive", FakeRight.class.getPackage().getName(),
            FakeRight.class.getSimpleName());
    public static final String VIEW = "minibadge.view";

    private Rights() {
        throw new IllegalStateException("Utility class");
    }
}

