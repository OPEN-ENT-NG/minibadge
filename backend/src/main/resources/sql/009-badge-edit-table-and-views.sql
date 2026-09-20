ALTER TABLE minibadge.badge
    RENAME COLUMN privatised_at TO privatized_at;

DROP VIEW minibadge.badge_public;
CREATE OR REPLACE VIEW minibadge.badge_public
AS
(
SELECT id, owner_id, badge_type_id
FROM minibadge.badge
WHERE privatized_at IS NULL
  AND refused_at IS NULL
  AND disabled_at IS NULL);

DROP VIEW IF EXISTS minibadge.badge_assignable;
CREATE OR REPLACE VIEW minibadge.badge_assignable
AS
(
SELECT id, owner_id, badge_type_id, privatized_at
FROM minibadge.badge
WHERE disabled_at IS NULL
  AND refused_at IS NULL);

DROP VIEW minibadge.badge_disabled;
CREATE OR REPLACE VIEW minibadge.badge_disabled
AS
(
SELECT id, owner_id, badge_type_id, privatized_at, refused_at, disabled_at
FROM minibadge.badge
WHERE disabled_at IS NOT NULL
   OR refused_at IS NOT NULL);