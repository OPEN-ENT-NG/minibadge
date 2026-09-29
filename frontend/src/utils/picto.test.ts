import { describe, expect, it } from 'vitest';

import { DEFAULT_AVATAR_ID, PICTO_IDS } from '~/config/constants';

import { getDefaultAvatarSrc, getPictoSrc } from './picto';

describe('getPictoSrc', () => {
  it('builds the static image URL from a pictureId', () => {
    expect(getPictoSrc('solidaire.svg')).toBe('/minibadge/public/img/solidaire.svg');
  });

  /**
   * Seven call sites used to inline this concatenation; five of them guarded on `pictureId` being
   * truthy and two didn't — the latter rendered `src=".../undefined"`. Returning `undefined` makes
   * "no picture" explicit so a caller can fall back to a placeholder or render nothing.
   */
  it('returns undefined rather than a ".../undefined" URL when there is no pictureId', () => {
    expect(getPictoSrc(undefined)).toBeUndefined();
    expect(getPictoSrc('')).toBeUndefined();
  });

  it('resolves every picto of the curated bank', () => {
    PICTO_IDS.forEach((pictoId) => {
      expect(getPictoSrc(pictoId)).toBe(`/minibadge/public/img/${pictoId}`);
    });
  });
});

describe('PICTO_IDS', () => {
  it('lists the 29 selectable pictos, without duplicates', () => {
    expect(PICTO_IDS).toHaveLength(29);
    expect(new Set(PICTO_IDS).size).toBe(PICTO_IDS.length);
  });

  /**
   * `default-avatar.svg` lives in the same folder but is the USER avatar placeholder, not a badge
   * illustration — offering it in the picker would let an establishment create a badge illustrated
   * with a generic person silhouette.
   */
  it('excludes the user avatar placeholder', () => {
    expect(PICTO_IDS).not.toContain(DEFAULT_AVATAR_ID as never);
  });

  it('only contains bare .svg filenames, never a path or an absolute URL', () => {
    PICTO_IDS.forEach((pictoId) => {
      expect(pictoId).toMatch(/^[a-z0-9-]+\.svg$/);
    });
  });
});

describe('getDefaultAvatarSrc', () => {
  it('points at the avatar placeholder in the same folder', () => {
    expect(getDefaultAvatarSrc()).toBe('/minibadge/public/img/default-avatar.svg');
  });
});
