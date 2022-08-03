DROP SCHEMA IF EXISTS minibadge CASCADE;
CREATE SCHEMA minibadge;

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE minibadge.scripts
(
    filename character varying(255)      NOT NULL,
    passed   timestamp without time zone NOT NULL DEFAULT now(),
    CONSTRAINT scripts_pkey PRIMARY KEY (filename)
);