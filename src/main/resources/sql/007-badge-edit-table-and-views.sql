ALTER TABLE minibadge.badge
    DROP CONSTRAINT IF EXISTS unique_structure_owner_type,
    ADD CONSTRAINT unique_owner_type UNIQUE (owner_id, badge_type_id),
    ADD COLUMN IF NOT EXISTS refused_at timestamp without time zone;


DROP VIEW minibadge.badge_public;
CREATE OR REPLACE VIEW minibadge.badge_public
AS
(
SELECT id, owner_id, badge_type_id
FROM minibadge.badge
WHERE privatised_at IS NULL
  AND disabled_at IS NULL);

DROP VIEW IF EXISTS minibadge.badge_assignable;
CREATE OR REPLACE VIEW minibadge.badge_assignable
AS
(
SELECT id, owner_id, badge_type_id, privatised_at
FROM minibadge.badge
WHERE disabled_at IS NULL);

DROP VIEW minibadge.badge_disabled;
CREATE OR REPLACE VIEW minibadge.badge_disabled
AS
(
SELECT id, owner_id, badge_type_id, privatised_at, disabled_at
FROM minibadge.badge
WHERE disabled_at IS NOT NULL
   OR refused_at IS NOT NULL);

ALTER TABLE minibadge.badge DROP COLUMN structure_id;