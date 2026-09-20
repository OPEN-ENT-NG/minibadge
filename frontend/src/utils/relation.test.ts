import { describe, expect, it } from 'vitest';

import { BadgeProtagonistSettingRelation } from '~/models/badgeType';
import { MinibadgeUser } from '~/models/user';
import { isMatchingAnyRelation } from '~/utils/relation';

const relation = (
  assignorTypeValue: string,
  receiverTypeValue: string,
): BadgeProtagonistSettingRelation => ({
  assignorType: { type: 'profile', typeValue: assignorTypeValue, label: `label.${assignorTypeValue}` },
  receiverType: { type: 'profile', typeValue: receiverTypeValue, label: `label.${receiverTypeValue}` },
});

const user = (profile: string | undefined, id = 'u1'): MinibadgeUser => ({
  id,
  displayName: id,
  profile,
  structureIds: [],
  structureNames: [],
});

describe('isMatchingAnyRelation', () => {
  it('matches when the assignor and at least one receiver satisfy the same relation', () => {
    const relations = [relation('Teacher', 'Student')];
    expect(isMatchingAnyRelation('Teacher', [user('Student')], relations)).toBe(true);
  });

  it('matches if ANY receiver satisfies a relation, not necessarily all of them', () => {
    const relations = [relation('Teacher', 'Student')];
    expect(isMatchingAnyRelation('Teacher', [user('Personnel', 'u1'), user('Student', 'u2')], relations)).toBe(
      true,
    );
  });

  it('does not match when the assignor profile does not satisfy any relation', () => {
    const relations = [relation('Teacher', 'Student')];
    expect(isMatchingAnyRelation('Student', [user('Student')], relations)).toBe(false);
  });

  it('does not match when no receiver satisfies any relation', () => {
    const relations = [relation('Teacher', 'Student')];
    expect(isMatchingAnyRelation('Teacher', [user('Teacher')], relations)).toBe(false);
  });

  it('checks every configured relation (OR across relations)', () => {
    const relations = [relation('Teacher', 'Student'), relation('Personnel', 'Personnel')];
    expect(isMatchingAnyRelation('Personnel', [user('Personnel')], relations)).toBe(true);
  });

  /**
   * VERIFIED BEHAVIOR (not a bug fixed here): with no relation configured at all,
   * `TypeSettings.isMatchingAnyRelation` returns `false` — an empty `relations` array
   * makes the inner `.some()` always `false`, so the outer `receivers.some()` is too.
   * See `relation.ts`'s doc comment.
   */
  it('returns false when no relation is configured for the badge type', () => {
    expect(isMatchingAnyRelation('Teacher', [user('Student')], [])).toBe(false);
  });

  it('returns false when the assignor has no known profile', () => {
    const relations = [relation('Teacher', 'Student')];
    expect(isMatchingAnyRelation(undefined, [user('Student')], relations)).toBe(false);
  });

  it('returns false when there are no receivers selected yet', () => {
    const relations = [relation('Teacher', 'Student')];
    expect(isMatchingAnyRelation('Teacher', [], relations)).toBe(false);
  });

  it('only supports the PROFILE protagonist type — any other type falls through to false', () => {
    const relations: BadgeProtagonistSettingRelation[] = [
      {
        assignorType: { type: 'somethingElse', typeValue: 'Teacher' },
        receiverType: { type: 'profile', typeValue: 'Student' },
      },
    ];
    expect(isMatchingAnyRelation('Teacher', [user('Student')], relations)).toBe(false);
  });
});
