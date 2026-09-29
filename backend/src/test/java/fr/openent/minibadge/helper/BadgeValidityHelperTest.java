package fr.openent.minibadge.helper;

import fr.openent.minibadge.core.constants.Field;
import fr.openent.minibadge.model.BadgeTypeSetting;
import io.vertx.core.json.JsonObject;
import org.junit.Test;

import java.time.LocalDate;

import static org.junit.Assert.*;

/**
 * Epic C: parsing/normalizing a badge type's end date. Whether a date is past, and the expiry frozen
 * into an assignment, are computed by SQL against the database clock (see the service tests).
 */
public class BadgeValidityHelperTest {

    @Test
    public void testParseAcceptsTheClientFormatAndATimestampShapedDatabaseValue() {
        assertEquals(LocalDate.of(2027, 6, 30), BadgeValidityHelper.parseValidUntil("2027-06-30"));
        assertEquals(LocalDate.of(2027, 6, 30), BadgeValidityHelper.parseValidUntil("2027-06-30T00:00:00.000"));
        assertEquals(LocalDate.of(2027, 6, 30), BadgeValidityHelper.parseValidUntil(" 2027-06-30 "));
    }

    @Test
    public void testParseRejectsAnythingThatIsNotARealDate() {
        assertNull(BadgeValidityHelper.parseValidUntil(null));
        assertNull(BadgeValidityHelper.parseValidUntil(""));
        assertNull(BadgeValidityHelper.parseValidUntil("30/06/2027"));
        assertNull(BadgeValidityHelper.parseValidUntil("2027-02-30"));
        assertNull(BadgeValidityHelper.parseValidUntil("2027-6-3"));
    }

    @Test
    public void testTheSettingModelNormalizesTheStoredEndDate() {
        assertEquals("2027-06-30", new BadgeTypeSetting(new JsonObject()
                .put(Field.VALID_UNTIL, "2027-06-30T00:00:00.000")).getValidUntil());
        assertNull(new BadgeTypeSetting(new JsonObject().putNull(Field.VALID_UNTIL)).getValidUntil());
        assertEquals("2027-06-30", new BadgeTypeSetting(new JsonObject()
                .put(Field.VALID_UNTIL, "2027-06-30")).toJson().getString(Field.VALIDUNTIL));
    }

    @Test
    public void testTheSettingModelCarriesTheSqlComputedExpiredFlag() {
        assertTrue(new BadgeTypeSetting(new JsonObject()
                .put(Field.VALID_UNTIL, "2020-01-01").put(Field.IS_EXPIRED, true)).getIsExpired());
        assertFalse("Absent flag = not expired (permanent or not read)",
                new BadgeTypeSetting(new JsonObject().put(Field.VALID_UNTIL, "2020-01-01")).getIsExpired());
        assertTrue(new BadgeTypeSetting(new JsonObject().put(Field.IS_EXPIRED, true))
                .toJson().getBoolean(Field.ISEXPIRED));
    }
}
