package fr.openent.minibadge.helper;

import fr.openent.minibadge.model.User;
import org.entcore.common.user.UserInfos;

import java.util.Collections;
import java.util.List;

public class UserHelper {
    private UserHelper() {
        throw new IllegalStateException("Utility class");
    }

    /**
     * Resolves which of the user's OWN structures a write should be scoped to.
     * <p>
     * A client-supplied structure id is never trusted: {@link fr.openent.minibadge.security.AdminRight}
     * is a bare workflow-right check with no structure awareness at all (the per-establishment scoping
     * is purely operational — how the ENT admin grants the right — and is not enforced by any code
     * here), so without this check an admin of school A could act on school B just by editing the
     * request body. Mirrors the precedent of {@code BadgeAssignedController#getAll}, where AdminRight
     * authorizes the action and the server scopes the data.
     *
     * @param user                 the authenticated user
     * @param submittedStructureId the structure id from the request body; may be null or blank
     * @return the validated structure id, or {@code null} when the request cannot be scoped
     * unambiguously: either the submitted structure is outside the user's own, or none was submitted
     * while the user belongs to several — picking one arbitrarily would silently write to the wrong
     * establishment, so for a multi-structure admin the field becomes mandatory.
     */
    public static String resolveStructureId(UserInfos user, String submittedStructureId) {
        List<String> structures = (user != null && user.getStructures() != null)
                ? user.getStructures() : Collections.emptyList();

        if (submittedStructureId != null && !submittedStructureId.trim().isEmpty()) {
            String structureId = submittedStructureId.trim();
            return structures.contains(structureId) ? structureId : null;
        }

        return structures.size() == 1 ? structures.get(0) : null;
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
