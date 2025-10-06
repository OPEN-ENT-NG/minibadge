CREATE TABLE minibadge.badge_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
    BEGIN
       NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON minibadge.badge_category
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE minibadge.rel_badge_category_badge_type (
    badge_category_id INT REFERENCES minibadge.badge_category (id) ON DELETE CASCADE,
    badge_type_id     INT REFERENCES minibadge.badge_type (id) ON DELETE CASCADE,
    PRIMARY KEY (badge_category_id, badge_type_id)
);

INSERT INTO minibadge.badge_category (name, slug) VALUES
    ('Appétence',      'APPETENCE'),
    ('Compétence',     'COMPETENCE'),
    ('Engagement',     'ENGAGEMENT'),
    ('Établissement',  'ETABLISSEMENT'),
    ('Gratitude',      'GRATITUDE'),
    ('Territoire',     'TERRITOIRE');


INSERT INTO minibadge.rel_badge_category_badge_type (badge_category_id, badge_type_id)
SELECT
    bc.id AS badge_category_id,
    bt.id AS badge_type_id
FROM minibadge.badge_category bc
         JOIN minibadge.badge_type bt ON (
    (bt.slug = 'AIME_LES_SCIENCES' AND bc.slug = 'APPETENCE') OR
    (bt.slug = 'ANIMATION' AND bc.slug = 'COMPETENCE') OR
    (bt.slug = 'AS_DU_NUMERIQUE' AND bc.slug = 'APPETENCE') OR
    (bt.slug = 'BIEN_ETRE_ANIMAL' AND bc.slug = 'ENGAGEMENT') OR
    (bt.slug = 'BIENVEILLANCE' AND bc.slug = 'COMPETENCE') OR
    (bt.slug = 'BRAVO' AND bc.slug = 'GRATITUDE') OR
    (bt.slug = 'CITOYENNETE' AND bc.slug = 'ENGAGEMENT') OR
    (bt.slug = 'COUTEAU_SUISSE' AND bc.slug = 'APPETENCE') OR
    (bt.slug = 'ECOLOGIE' AND bc.slug = 'ENGAGEMENT') OR
    (bt.slug = 'EGALITE_DES_GENRES' AND bc.slug = 'ENGAGEMENT') OR
    (bt.slug = 'ENVIRONNEMENT' AND bc.slug = 'ENGAGEMENT') OR
    (bt.slug = 'ESPRIT_D_OUVERTURE' AND bc.slug = 'COMPETENCE') OR
    (bt.slug = 'IMPLICATION' AND bc.slug = 'COMPETENCE') OR
    (bt.slug = 'MAITRE_DES_LETTRES' AND bc.slug = 'APPETENCE') OR
    (bt.slug = 'MEDIATION' AND bc.slug = 'COMPETENCE') OR
    (bt.slug = 'MERCI' AND bc.slug = 'GRATITUDE') OR
    (bt.slug = 'MOTIVATION' AND bc.slug = 'COMPETENCE') OR
    (bt.slug = 'PATIENCE' AND bc.slug = 'COMPETENCE') OR
    (bt.slug = 'RESPONSABLE' AND bc.slug = 'COMPETENCE') OR
    (bt.slug = 'SAVOIR_ETRE' AND bc.slug = 'COMPETENCE') OR
    (bt.slug = 'SAVOIR_VIVRE' AND bc.slug = 'COMPETENCE') OR
    (bt.slug = 'SENS_ARTISTIQUE' AND bc.slug = 'APPETENCE') OR
    (bt.slug = 'SENTINELLE' AND bc.slug = 'ENGAGEMENT') OR
    (bt.slug = 'SOLIDAIRE' AND bc.slug = 'ENGAGEMENT') OR
    (bt.slug = 'SOURIRE' AND bc.slug = 'GRATITUDE') OR
    (bt.slug = 'TOTALEMENT_SPORT' AND bc.slug = 'APPETENCE') OR
    (bt.slug = 'TRAVAIL_EN_EQUIPE' AND bc.slug = 'COMPETENCE') OR
    (bt.slug = 'TUTORAT' AND bc.slug = 'COMPETENCE')
    );

