package fr.openent.minibadge.core.enums;

public enum BadgeCategoryIcon {
    BRAIN("BRAIN", "brain"),
    SCHOOL("SCHOOL", "school"),
    ARM_FLEX("ARM_FLEX", "arm-flex"),
    MEDAL("MEDAL", "medal"),
    EMPTY("", "");

    private final String name;
    private final String cssClass;

    BadgeCategoryIcon(String name, String cssClass) {
        this.name = name;
        this.cssClass = cssClass;
    }

    public String getName() {
        return name;
    }

    public String getCssClass() {
        return cssClass;
    }

    public static BadgeCategoryIcon fromName(String name) {
        if (name == null || name.isEmpty()) {
            return EMPTY;
        }
        for (BadgeCategoryIcon icon : BadgeCategoryIcon.values()) {
            if (icon.getName().equalsIgnoreCase(name)) {
                return icon;
            }
        }
        return EMPTY;
    }
}
