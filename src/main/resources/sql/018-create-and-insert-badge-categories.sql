CREATE TABLE minibadge.badge_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE minibadge.rel_badge_category_badge_type (
    badge_category_id INT REFERENCES minibadge.badge_category (id) ON DELETE CASCADE,
    badge_type_id     INT REFERENCES minibadge.badge_type (id) ON DELETE CASCADE,
    PRIMARY KEY (badge_category_id, badge_type_id)
);

INSERT INTO minibadge.badge_category (name) VALUES
('Appétence'),
('Compétence'),
('Engagement'),
('Établissement'),
('Gratitude'),
('Territoire');

