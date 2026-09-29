package fr.openent.minibadge.helper;

import io.vertx.ext.unit.junit.VertxUnitRunner;
import org.entcore.common.user.UserInfos;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

/**
 * Epic B, Task 3 — the server-side structure scoping of {@code POST /minibadge/types}.
 * <p>
 * {@code AdminRight} only checks a workflow right and knows nothing about structures, so this is the
 * ONLY thing standing between an admin of school A and creating a badge type inside school B.
 * Rejecting an out-of-scope structure id is therefore a security assertion, not a validation nicety.
 */
@RunWith(VertxUnitRunner.class)
public class UserHelperTest {

    private static UserInfos user(List<String> structures) {
        UserInfos user = new UserInfos();
        user.setUserId("user1");
        user.setStructures(structures);
        return user;
    }

    @Test
    public void testAcceptsAStructureTheUserBelongsTo() {
        assertEquals("structure2",
                UserHelper.resolveStructureId(user(Arrays.asList("structure1", "structure2")), "structure2"));
    }

    @Test
    public void testRejectsAStructureOutsideTheUsersOwn() {
        assertNull("A structureId from the request body is never trusted on its own",
                UserHelper.resolveStructureId(user(Collections.singletonList("structure1")), "structureOfSomeoneElse"));
    }

    @Test
    public void testDerivesTheOnlyStructureWhenNoneIsSubmitted() {
        assertEquals("structure1",
                UserHelper.resolveStructureId(user(Collections.singletonList("structure1")), null));
    }

    @Test
    public void testTreatsABlankSubmittedStructureAsAbsent() {
        assertEquals("structure1",
                UserHelper.resolveStructureId(user(Collections.singletonList("structure1")), "   "));
    }

    /**
     * The multi-structure admin case: silently picking one of several establishments would create the
     * badge in the wrong school with no way to remove it afterwards (there is no delete endpoint), so
     * the field becomes mandatory instead.
     */
    @Test
    public void testRequiresAnExplicitStructureWhenTheUserBelongsToSeveral() {
        assertNull(UserHelper.resolveStructureId(user(Arrays.asList("structure1", "structure2")), null));
    }

    @Test
    public void testRejectsWhenTheUserBelongsToNoStructureAtAll() {
        assertNull(UserHelper.resolveStructureId(user(Collections.emptyList()), null));
        assertNull(UserHelper.resolveStructureId(user(Collections.emptyList()), "structure1"));
        assertNull(UserHelper.resolveStructureId(user(null), "structure1"));
    }

    @Test
    public void testTrimsTheSubmittedStructureId() {
        assertEquals("structure1",
                UserHelper.resolveStructureId(user(Collections.singletonList("structure1")), " structure1 "));
    }
}
