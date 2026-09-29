package fr.openent.minibadge.helper;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * Epic C: pure rules around a badge type's end date ({@code badge_type_setting.valid_until}, a SQL
 * {@code DATE}, NULL meaning permanent) and the expiry it freezes into each assignment
 * ({@code badge_assigned.expires_at}, a {@code timestamp without time zone}).
 * <p>
 * The end date is inclusive: a badge "valable jusqu'au 30/06" is valid for the whole of June 30th, so
 * the frozen expiry is the NEXT day at 00:00. Format only: every "is this date past" decision is
 * taken by SQL against the database clock ({@code CURRENT_DATE} / {@code now()}), never here — the JVM
 * and the database may run in different timezones.
 */
public class BadgeValidityHelper {

    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ISO_LOCAL_DATE;

    private BadgeValidityHelper() {
        throw new IllegalStateException("Utility class");
    }

    /**
     * @param value an end date as sent by the client ({@code YYYY-MM-DD}) or read back from the
     *              {@code DATE} column — only its first 10 characters are considered, so a value
     *              serialized as a timestamp ({@code 2026-06-30T00:00:00.000}) is read the same way.
     * @return the parsed date, or {@code null} when {@code value} is null, blank or not a valid date.
     */
    public static LocalDate parseValidUntil(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        if (trimmed.length() < 10) return null;
        try {
            return LocalDate.parse(trimmed.substring(0, 10), ISO_DATE);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    /** {@code YYYY-MM-DD}, the format both the client and the {@code DATE} column use; null stays null. */
    public static String format(LocalDate validUntil) {
        return validUntil != null ? validUntil.format(ISO_DATE) : null;
    }
}
