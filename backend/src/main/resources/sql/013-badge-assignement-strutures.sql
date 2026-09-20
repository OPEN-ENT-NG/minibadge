CREATE TABLE minibadge.badge_assigned_structure
(
    id                    bigserial PRIMARY KEY,
    badge_assigned_id     bigint REFERENCES minibadge.badge_assigned (id),
    structure_id          character varying(36)                     NOT NULL,
    is_structure_assigner boolean                     DEFAULT false NOT NULL,
    is_structure_receiver boolean                     DEFAULT false NOT NULL,
    updated_at            timestamp without time zone DEFAULT now() NOT NULL,
    created_at            timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TRIGGER badge_assigned_structure_update_at
    BEFORE UPDATE
    ON minibadge.badge_assigned_structure
    FOR EACH ROW
EXECUTE PROCEDURE minibadge.set_updated_at();