INSERT INTO minibadge.badge_type_setting (structure_id, badge_type_id, is_self_assignable, level)
VALUES
    (NULL, 2,  TRUE, NULL),
    (NULL, 3,  TRUE, NULL),
    (NULL, 4,  TRUE, NULL),
    (NULL, 7,  TRUE, NULL),
    (NULL, 8,  TRUE, NULL),
    (NULL, 9,  TRUE, NULL),
    (NULL, 10, TRUE, NULL),
    (NULL, 11, TRUE, NULL),
    (NULL, 13, TRUE, NULL),
    (NULL, 22, TRUE, NULL),
    (NULL, 23, TRUE, NULL),
    (NULL, 24, TRUE, NULL),
    (NULL, 26, TRUE, NULL)
    ON CONFLICT (structure_id, badge_type_id) DO NOTHING;
