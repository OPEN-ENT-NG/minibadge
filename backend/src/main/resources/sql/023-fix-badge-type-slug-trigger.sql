-- Epic B: badge type creation moves from SQL seeds to end users, which finally exercises
-- minibadge.update_and_slugify_badge_type() (sql/003-init-setting-tables.sql) with real
-- collisions. `slug` is globally UNIQUE while `label` is not, so two establishments both
-- creating "Entraide" go through the de-duplication counter below. Two genuine bugs made
-- that counter unusable, both invisible to the seeds that were its only caller until now:
--
--   1. `slug LIKE CONCAT(newSlug, '_')` — in LIKE, `_` matches any single character, so it
--      only ever caught the 1-digit suffixes SLUG1..SLUG9 (SLUG10 was never matched, and the
--      counter then handed out an already-taken slug). The same wildcard also made any slug
--      containing a literal underscore — i.e. all of them, since minibadge.slugify() turns
--      every non-alphanumeric run into `_` — match unrelated labels. Replaced by an exact
--      prefix comparison (`left(...)`, no wildcard semantics at all) plus a numeric-suffix
--      check, which needs no LIKE escaping.
--
--   2. `created_at < NEW.created_at` — `now()` is fixed for a whole transaction, so rows
--      created in the same transaction share the exact same timestamp and were invisible to
--      each other, handing them the same slug. Replaced by `id IS DISTINCT FROM NEW.id`,
--      which only excludes the row being written (the point of the original comparison) and
--      is blind to timing. The bigserial default is already applied when a BEFORE INSERT
--      trigger runs, so NEW.id is populated here.
--
-- The trailing loop closes the remaining gap: a count is only a safe next suffix while the
-- suffix sequence has no holes. Since minibadge has no delete endpoint a hole is unlikely,
-- but the cost of being wrong is a UNIQUE violation that aborts the whole creation.
--
-- minibadge.slugify() is deliberately left untouched. Only the function body changes:
-- badge_type_trigger already points at it, so it keeps working as-is.
--
-- Verified manually against postgres:14 (the suite has no database), inserting into a table with
-- this schema, before and after:
--   12 x "Entraide", one transaction | OLD: 1 row inserted, 11 unique_violation
--                                    | NEW: 12 rows, 12 distinct slugs (ENTRAIDE..ENTRAIDE11)
--   3 x "Solidarite", one transaction | NEW: SOLIDARITE, SOLIDARITE1, SOLIDARITE2
--   "AS DU NUMERIQUE" twice, with an unrelated "ASXDUYNUMERIQUE" in between
--                                    | NEW: AS_DU_NUMERIQUE, ASXDUYNUMERIQUE, AS_DU_NUMERIQUE1
--                                      (the unrelated label no longer matched through the `_` wildcard)
--   "Merci" x3, MERCI1 deleted, then "Merci" again | NEW: MERCI, MERCI2, MERCI3 (no collision)
--
-- Known limitation (the table above is NOT exhaustive). The count is a prefix heuristic: it cannot
-- tell "an existing numbered duplicate of newSlug" apart from "an unrelated slug that merely starts
-- with newSlug and ends in digits". So an existing LEVEL2 (from the label "Level2") makes a brand-new,
-- genuinely unique label "Level" come out as LEVEL1 instead of LEVEL. Verified against postgres:14.
-- This is cosmetic only: the trailing WHILE EXISTS loop still guarantees uniqueness, so there is no
-- UNIQUE violation and no crash — just a non-minimal, surprising slug. It is inherent to the
-- prefix-matching approach (short of storing the base slug in its own column, which would change the
-- schema and every consumer), not a regression introduced here, and the previous LIKE-based code was
-- wrong in the same situation and several worse ones besides.
CREATE OR REPLACE FUNCTION minibadge.update_and_slugify_badge_type() RETURNS TRIGGER AS
$BODY$
DECLARE
    countSlugs    int;
    newSlug       character varying;
    candidateSlug character varying;
BEGIN

    SELECT minibadge.slugify(NEW.label) INTO newSlug;

    SELECT COUNT(id)::INTEGER
    FROM minibadge.badge_type
    WHERE left(slug, length(newSlug)) = newSlug
      AND substring(slug FROM length(newSlug) + 1) ~ '^[0-9]*$'
      AND id IS DISTINCT FROM NEW.id
    INTO countSlugs;

    IF countSlugs > 0
    THEN
        candidateSlug = CONCAT(newSlug, countSlugs);
    ELSE
        candidateSlug = newSlug;
    END IF;

    WHILE EXISTS (SELECT 1
                  FROM minibadge.badge_type
                  WHERE slug = candidateSlug
                    AND id IS DISTINCT FROM NEW.id)
        LOOP
            countSlugs = countSlugs + 1;
            candidateSlug = CONCAT(newSlug, countSlugs);
        END LOOP;

    NEW.slug = candidateSlug;
    NEW.updated_at = now();
RETURN NEW;
END
$BODY$
LANGUAGE plpgsql;
