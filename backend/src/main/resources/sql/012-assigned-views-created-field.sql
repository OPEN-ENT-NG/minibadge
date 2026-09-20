DROP VIEW minibadge.badge_assigned_valid;
CREATE OR REPLACE VIEW minibadge.badge_assigned_valid
AS
(
SELECT id, badge_id, assignor_id, created_at
FROM minibadge.badge_assigned
WHERE revoked_at IS NULL);

DROP VIEW minibadge.badge_assigned_revoked;
CREATE OR REPLACE VIEW minibadge.badge_assigned_revoked
AS
(
SELECT id, badge_id, assignor_id, revoked_at, created_at
FROM minibadge.badge_assigned
WHERE revoked_at IS NOT NULL);