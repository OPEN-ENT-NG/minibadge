-- Epic C: badge validity duration ("Durée de vie des badges").
--
-- A badge type may carry a free end date (badge_type_setting.valid_until, NULL = permanent). Each
-- assignment freezes the date that applied when it was made into badge_assigned.expires_at
-- (valid_until + 1 day at 00:00, so the badge is valid for the whole end day). Expiry is silent and
-- computed at read time: no notification, no scheduled job — now() is evaluated on every query.
--
-- Every existing row keeps NULL in both new columns, so nothing that exists today ever expires.
-- Central badge types (structure_id IS NULL) are configured by a later migration of this form:
--   UPDATE minibadge.badge_type_setting SET valid_until = 'YYYY-MM-DD'
--   WHERE structure_id IS NULL AND badge_type_id = <id>;
-- Such an update only affects assignments made AFTER it: expires_at values are frozen.
--
-- Verified manually against postgres:14 (the suite has no database; DB timezone Europe/Paris),
-- migrations 001..023 applied, a permanent and a revoked assignment created, then this script applied
-- (twice, and once more after a simulated interruption leaving the temporary index behind):
--   existing rows                          | expires_at / valid_until all NULL, both views unchanged
--   duplicate permanent assignment         | REFUSED (one_assignment_per_assignor, key ... infinity)
--   re-award after a revoked assignment    | accepted (as before)
--   re-award after an EXPIRED assignment   | accepted; badge_assigned_active no longer lists the owner
--   quota / statistics queries             | still count the expired assignment (badge_assigned_valid)
-- and the single assignment statement of DefaultBadgeAssignedService#assign run against it:
--   expired type / still-active assignment | refused by its type_expired / already_assigned flags,
--                                          | nothing inserted (also after the end date was extended)
--   end date = today                       | accepted, expires_at = tomorrow 00:00 (CURRENT_DATE based)
--   two concurrent identical assignments   | the 2nd blocks on the index, then fails with 23505
--   controls: the sql/004 index refuses the re-award after expiry; an index on the raw expires_at
--   (no COALESCE) accepts two permanent duplicates; now() in the predicate fails ("must be IMMUTABLE").

ALTER TABLE minibadge.badge_type_setting
    ADD COLUMN IF NOT EXISTS valid_until DATE;

ALTER TABLE minibadge.badge_assigned
    ADD COLUMN IF NOT EXISTS expires_at timestamp without time zone;

-- "Currently held" assignments: not revoked AND not expired. Only the read paths about the present
-- state move onto it (assigners, receivers, self-assign check, users-search "already assigned by me").
--
-- minibadge.badge_assigned_valid (sql/012) is deliberately left untouched: quotas
-- (SqlHelper#getCTEThreshold) and statistics (DefaultStatisticService) read it and must keep counting
-- expired assignments — a badge given today counts against today's quota even if it expires
-- tomorrow, and statistics are historical.
CREATE OR REPLACE VIEW minibadge.badge_assigned_active
AS
(
SELECT id, badge_id, assignor_id, created_at, expires_at
FROM minibadge.badge_assigned
WHERE revoked_at IS NULL
  AND (expires_at IS NULL OR expires_at > now()));

-- The previous index (sql/004) allowed a single non-revoked assignment per (badge, assignor) FOREVER:
-- an expired-but-not-revoked assignment would block re-awarding the same badge to the same person.
-- Postgres forbids now() in an index predicate (it must be immutable), so expiry cannot be expressed
-- there. The frozen expires_at becomes part of the key instead.
--
-- The COALESCE is essential: NULLs are distinct in a unique index, so indexing the raw expires_at
-- would let two PERMANENT (NULL) assignments of the same badge by the same assignor coexist — the
-- very duplicate the old index prevented. 'infinity' keeps permanent assignments colliding.
--
-- The index alone cannot tell an expired assignment from an active one with a different end date
-- (e.g. the end date was extended while a previous assignment is still running): that "still active"
-- rule is enforced by the assignment INSERT itself (DefaultBadgeAssignedService#assign), against
-- badge_assigned_active; this index stays the backstop for two concurrent identical assignments.
--
-- Swapped without ever leaving the table unprotected, even if the migration runner does not wrap this
-- file in a transaction: the new index is built under a temporary name while the old one still
-- enforces uniqueness (every row the old key accepts, the wider new key accepts too), then the old one
-- is dropped and the new one takes its name. Re-runnable: a second run rebuilds the same index the
-- same way, and a run interrupted after the CREATE reuses the temporary index.
CREATE UNIQUE INDEX IF NOT EXISTS one_assignment_per_assignor_024
    ON minibadge.badge_assigned (badge_id, assignor_id, COALESCE(expires_at, 'infinity'::timestamp))
    WHERE revoked_at IS NULL;
DROP INDEX IF EXISTS minibadge.one_assignment_per_assignor;
ALTER INDEX IF EXISTS minibadge.one_assignment_per_assignor_024 RENAME TO one_assignment_per_assignor;
