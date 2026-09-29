import { DEFAULT_AVATAR_ID } from '~/config/constants';

/**
 * Base path of the static image folder served by the backend
 * (`backend/src/main/resources/public/img/`).
 */
const PICTO_BASE_PATH = '/minibadge/public/img';

/**
 * Resolves a `badgeType.pictureId` to the URL of its SVG.
 *
 * This concatenation used to be duplicated in seven places (`BadgeCard`, `badge-type-detail`,
 * `statistics` x3, `badges-admin`, `badges-given`). Centralizing it is a prerequisite of the badge
 * creation form: `pictureId` is now a value a user picks, so the "what does a pictureId mean" rule
 * has to live in exactly one place.
 *
 * It also pins the constraint behind the curated picto bank: every consumer assumes `pictureId` is a
 * bare filename inside that folder, so an arbitrary uploaded workspace URL would silently produce a
 * broken image in all seven of them. Custom uploads are therefore out of scope until `pictureId`
 * grows a two-field shape (`{ defaultImage, image }`) the way `communities` did.
 *
 * @returns the picto URL, or `undefined` when there is no picture — callers decide what to render
 * instead (a placeholder image, or nothing at all).
 */
export const getPictoSrc = (pictureId?: string): string | undefined =>
  pictureId ? `${PICTO_BASE_PATH}/${pictureId}` : undefined;

/** URL of the user-avatar placeholder. Same folder, different meaning — see `DEFAULT_AVATAR_ID`. */
export const getDefaultAvatarSrc = (): string => `${PICTO_BASE_PATH}/${DEFAULT_AVATAR_ID}`;
