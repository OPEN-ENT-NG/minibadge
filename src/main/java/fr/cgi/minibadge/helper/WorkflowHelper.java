package fr.cgi.minibadge.helper;

import org.entcore.common.user.UserInfos;

import java.util.List;

public class WorkflowHelper {

    private WorkflowHelper() {
    }

    public static boolean hasRight(UserInfos user, String action) {
        List<UserInfos.Action> actions = user.getAuthorizedActions();
        return actions.stream().anyMatch(a -> action.equals(a.getDisplayName()));
    }
}
