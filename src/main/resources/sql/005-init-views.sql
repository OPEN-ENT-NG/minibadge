CREATE OR REPLACE VIEW minibadge.badge_assigned_valid
AS
(
SELECT ba.id, ba.badge_id, ba.assignor_id, ba.accepted_at
FROM minibadge.badge_assigned ba
         INNER JOIN minibadge.badge b on b.id = ba.badge_id
WHERE accepted_at IS NOT NULL
  AND revoked_at IS NULL
  AND b.disabled_at IS NULL
  AND b.privatised_at IS NULL);

CREATE OR REPLACE VIEW minibadge.badge_assigned_revoked
AS
(
SELECT id, badge_id, assignor_id, accepted_at, revoked_at
FROM minibadge.badge_assigned
WHERE revoked_at IS NOT NULL);

CREATE OR REPLACE VIEW minibadge.badge_public
AS
(
SELECT id, structure_id, owner_id, badge_type_id, privatised_at
FROM minibadge.badge
WHERE disabled_at IS NULL
  AND privatised_at IS NULL);

CREATE OR REPLACE VIEW minibadge.badge_disabled
AS
(
SELECT id, structure_id, owner_id, badge_type_id, privatised_at, disabled_at
FROM minibadge.badge
WHERE disabled_at IS NOT NULL);