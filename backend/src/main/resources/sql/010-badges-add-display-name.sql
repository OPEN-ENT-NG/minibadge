CREATE TABLE minibadge.user (
    id character varying(255) NOT NULL,
    display_name character varying(255) NOT NULL,
    CONSTRAINT user_pk PRIMARY KEY (id)
);

ALTER TABLE minibadge.badge
ADD CONSTRAINT badge_user_fk
 FOREIGN KEY (owner_id) REFERENCES minibadge.user (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE;


