-- Epic A: Attribution des badges par les enseignants.
-- Seeds the badge_protagonist_setting rows behind the (until now always-hardcoded)
-- assignation relations, for every centrally-configured badge_type_setting
-- (structure_id IS NULL): Student->Student is re-seeded explicitly to preserve the
-- existing behaviour, and Teacher->Student is added so teachers can assign too.
-- The SENDER_PROFILE rows form the authorized assignor set, the TARGET_PROFILE rows
-- the authorized receiver set; their cartesian product is read back by
-- DefaultBadgeProtagonistSettingService as {Student->Student, Teacher->Student}.
INSERT INTO minibadge.badge_protagonist_setting (badge_type_setting_id, protagonist_type_id, protagonist_type)
SELECT bts.id, protagonist.protagonist_type_id, protagonist.protagonist_type
FROM minibadge.badge_type_setting bts
    CROSS JOIN (
        VALUES
            ('Student', 'SENDER_PROFILE'),
            ('Teacher', 'SENDER_PROFILE'),
            ('Student', 'TARGET_PROFILE')
    ) AS protagonist (protagonist_type_id, protagonist_type)
WHERE bts.structure_id IS NULL
ON CONFLICT (badge_type_setting_id, protagonist_type_id, protagonist_type) DO NOTHING;
