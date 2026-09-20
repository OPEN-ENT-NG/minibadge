CREATE TABLE minibadge.badge
(
    id            bigserial PRIMARY KEY,
    structure_id  character varying(36)                     NOT NULL,
    owner_id      character varying(36)                     NOT NULL,
    badge_type_id bigint REFERENCES minibadge.badge_type (id),
    privatised_at timestamp without time zone,
    disabled_at   timestamp without time zone,
    updated_at    timestamp without time zone DEFAULT now() NOT NULL,
    created_at    timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT unique_structure_owner_type UNIQUE (structure_id, owner_id, badge_type_id)
);

CREATE TRIGGER badge_update_at
    BEFORE UPDATE
    ON minibadge.badge
    FOR EACH ROW
    EXECUTE PROCEDURE minibadge.set_updated_at();

CREATE TABLE minibadge.badge_assigned
(
    id          bigserial PRIMARY KEY,
    badge_id    bigint REFERENCES minibadge.badge (id),
    assignor_id character varying(36)                     NOT NULL,
    accepted_at timestamp without time zone,
    revoked_at  timestamp without time zone,
    updated_at  timestamp without time zone DEFAULT now() NOT NULL,
    created_at  timestamp without time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX one_assignment_per_assignor ON minibadge.badge_assigned (badge_id, assignor_id) WHERE revoked_at IS NULL;

CREATE TRIGGER badge_assigned_update_at
    BEFORE UPDATE
    ON minibadge.badge_assigned
    FOR EACH ROW
    EXECUTE PROCEDURE minibadge.set_updated_at();

CREATE TABLE minibadge.badge_event
(
    id          bigserial PRIMARY KEY,
    badge_id    bigint REFERENCES minibadge.badge (id),
    assignor_id character varying(36)                     NOT NULL,
    event_type  text                                      NOT NULL,
    updated_at  timestamp without time zone DEFAULT now() NOT NULL,
    created_at  timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT protagonist_type_check CHECK (event_type IN ('LIKE', 'ENDORSE'))
);

CREATE TRIGGER badge_event_update_at
    BEFORE UPDATE
    ON minibadge.badge_event
    FOR EACH ROW
    EXECUTE PROCEDURE minibadge.set_updated_at();