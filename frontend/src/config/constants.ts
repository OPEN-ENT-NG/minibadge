/**
 * The curated picto bank an establishment can pick from when creating a badge type.
 *
 * These are the SVG files actually shipped in `backend/src/main/resources/public/img/`, minus
 * `default-avatar.svg` — that one is the USER avatar placeholder (`UserPickerLists`,
 * `routes/statistics`), not a badge illustration.
 *
 * Hardcoded on purpose: no backend endpoint exposes this directory, and the sibling `communities`
 * app solved the identical problem the same way (`BACKGROUND_IMAGES` + a `getCoverSrc()` resolver).
 * The list is deliberately the only source of `pictureId` values a user can produce — see
 * `~/utils/picto` for why an arbitrary uploaded URL would break every existing consumer.
 *
 * Adding a picto means dropping the SVG into that folder AND adding its filename here.
 */
export const PICTO_IDS = [
  'animation.svg',
  'artistique.svg',
  'as-numerique.svg',
  'bien-etre-animal.svg',
  'bienveillance.svg',
  'bravo.svg',
  'citoyennete.svg',
  'couteau-suisse.svg',
  'ecologie.svg',
  'egalite-genre.svg',
  'environnement.svg',
  'implication.svg',
  'maitre-lettres.svg',
  'mediation.svg',
  'merci.svg',
  'motivation.svg',
  'ouverture-esprit.svg',
  'patience.svg',
  'responsable.svg',
  'savoir-etre.svg',
  'savoir-vivre.svg',
  'sciences.svg',
  'sentinelle.svg',
  'solidaire.svg',
  'sourire.svg',
  'sport.svg',
  'travail-equipe.svg',
  'tutorat.svg',
  'uni-minibadge.svg',
] as const;

export type PictoId = (typeof PICTO_IDS)[number];

/** Avatar placeholder for a user with no photo — NOT a badge picto, hence excluded from `PICTO_IDS`. */
export const DEFAULT_AVATAR_ID = 'default-avatar.svg';
