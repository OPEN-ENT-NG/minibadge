package fr.cgi.minibadge.helper;

import fr.cgi.minibadge.model.User;

import java.util.List;

public class UserHelper {
    private UserHelper() {
        throw new IllegalStateException("Utility class");
    }

    public static List<User> mergeUsernamesAndProfiles(List<User> fromUsers, List<User> toUsers) {
        toUsers.forEach(toUser -> fromUsers.stream()
                .filter(user -> user.getUserId().equals(toUser.getUserId()))
                .findFirst()
                .ifPresent(user -> {
                    toUser.setUsername(user.getUsername());
                    toUser.setType(user.getType());
                }));
        return toUsers;
    }
}
