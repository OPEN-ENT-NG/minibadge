CREATE TABLE minibadge.badge_setting
(
    id                          bigserial PRIMARY KEY,
    structure_id                character varying(36),
    threshold_max_assignable    int                                       NOT NULL,
    threshold_period_assignable text                                      NOT NULL,
    updated_at                  timestamp without time zone DEFAULT now() NOT NULL,
    created_at                  timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT threshold_max_assignable_nonnegative CHECK (threshold_max_assignable >= 0),
    CONSTRAINT threshold_period_assignable_check CHECK (threshold_period_assignable IN ('DAY', 'WEEK', 'MONTH')),
    CONSTRAINT unique_structure_period UNIQUE (structure_id, threshold_period_assignable)
);

CREATE TRIGGER badge_setting_update_at
    BEFORE UPDATE
    ON minibadge.badge_setting
    FOR EACH ROW
    EXECUTE PROCEDURE minibadge.set_updated_at();

CREATE TABLE minibadge.badge_type
(
    id           bigserial PRIMARY KEY,
    slug         text UNIQUE                               NOT NULL,
    structure_id character varying(36),
    owner_id     character varying(36),
    picture_id   character varying(36),
    label        text                                      NOT NULL,
    description  text,
    updated_at   timestamp without time zone DEFAULT now() NOT NULL,
    created_at   timestamp without time zone DEFAULT now() NOT NULL
);

CREATE OR REPLACE FUNCTION minibadge.update_and_slugify_badge_type() RETURNS TRIGGER AS
$BODY$
DECLARE
countSlugs int;
    newSlug    character varying;
BEGIN
    --
SELECT minibadge.slugify(NEW.label) INTO newSlug;

--
SELECT COUNT(id)::INTEGER
FROM minibadge.badge_type
WHERE (slug LIKE CONCAT(newSlug, '_')
    OR slug = newSlug)
  AND created_at < NEW.created_at
    INTO countSlugs;


IF countSlugs > 0
    THEN
        NEW.slug = CONCAT(newSlug, countSlugs);
ELSE
        NEW.slug = newSlug;
END IF;

    NEW.updated_at = now();
RETURN NEW;
END
$BODY$
LANGUAGE plpgsql;

CREATE TRIGGER badge_type_trigger
    BEFORE INSERT OR UPDATE
                         ON minibadge.badge_type
                         FOR EACH ROW
                         EXECUTE PROCEDURE minibadge.update_and_slugify_badge_type();


CREATE TABLE minibadge.badge_type_setting
(
    id                 bigserial PRIMARY KEY,
    structure_id       character varying(36),
    badge_type_id      bigint                                    NOT NULL REFERENCES minibadge.badge_type (id),
    is_self_assignable boolean,
    level              text,
    updated_at         timestamp without time zone DEFAULT now() NOT NULL,
    created_at         timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT level_check CHECK (level IN ('1D', '2D', null)),
    CONSTRAINT unique_structure_type UNIQUE (structure_id, badge_type_id)
);

CREATE TRIGGER badge_type_settings_update_at
    BEFORE UPDATE
    ON minibadge.badge_type_setting
    FOR EACH ROW
    EXECUTE PROCEDURE minibadge.set_updated_at();


CREATE TABLE minibadge.badge_protagonist_setting
(
    id                    bigserial PRIMARY KEY,
    badge_type_setting_id bigint REFERENCES minibadge.badge_type_setting (id),
    protagonist_type_id   character varying(36)                     NOT NULL,
    protagonist_type      TEXT                                      NOT NULL,
    updated_at            timestamp without time zone DEFAULT now() NOT NULL,
    created_at            timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT protagonist_type_check CHECK (protagonist_type IN
                                             ('SENDER_AUDIENCE', 'SENDER_PROFILE', 'TARGET_AUDIENCE',
                                              'TARGET_PROFILE')),
    CONSTRAINT unique_setting_protagonist_type UNIQUE (badge_type_setting_id, protagonist_type_id, protagonist_type)
);

CREATE TRIGGER badge_protagonist_setting_update_at
    BEFORE UPDATE
    ON minibadge.badge_protagonist_setting
    FOR EACH ROW
    EXECUTE PROCEDURE minibadge.set_updated_at();


CREATE TABLE minibadge.badge_tag
(
    id           bigserial PRIMARY KEY,
    structure_id character varying(36),
    owner_id     character varying(36),
    label        text                                      NOT NULL,
    updated_at   timestamp without time zone DEFAULT now() NOT NULL,
    created_at   timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE minibadge.badge_type_tag
(
    badge_type_id int REFERENCES minibadge.badge_type (id) ON UPDATE CASCADE ON DELETE CASCADE,
    badge_tag_id  int REFERENCES minibadge.badge_tag (id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT bill_product_pkey PRIMARY KEY (badge_type_id, badge_tag_id)
);

CREATE TRIGGER badge_tag_update_at
    BEFORE UPDATE
    ON minibadge.badge_tag
    FOR EACH ROW
    EXECUTE PROCEDURE minibadge.set_updated_at();
