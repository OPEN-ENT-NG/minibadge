CREATE OR REPLACE FUNCTION minibadge.slugify(value TEXT) RETURNS TEXT
    STRICT IMMUTABLE AS
$BODY$
BEGIN
    -- 1. trim trailing and leading whitespaces from text
    -- 2. remove accents (diacritic signs) from a given text
    -- 3. lowercase unaccented text
    -- 4. replace non-alphanumeric (excluding hyphen, underscore) with a hyphen
    -- 5. trim leading and trailing hyphens
RETURN trim(BOTH '_' FROM regexp_replace(upper(unaccent(trim(value))), '[^a-z0-9\\-_]+', '_', 'gi'));
END;
$BODY$
LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION minibadge.set_updated_at() RETURNS TRIGGER AS
$BODY$
BEGIN
    NEW.updated_at = now();
RETURN NEW;
END
$BODY$
LANGUAGE plpgsql;