import { BadgeProtagonistSetting, BadgeProtagonistSettingRelation } from '~/models/badgeType';
import { MinibadgeUser } from '~/models/user';

/**
 * Only the `'profile'` protagonist type is supported today. `type` is
 * DB-seeded, free-form configuration data on the backend — a future `type`
 * value it might start sending would silently fall through to `false` here,
 * an accepted limitation rather than a bug.
 */
const PROFILE_PROTAGONIST_TYPE = 'profile';

const isProtagonistValid = (
  setting: BadgeProtagonistSetting,
  profile: string | undefined,
): boolean => {
  if (!profile) return false;
  switch (setting.type) {
    case PROFILE_PROTAGONIST_TYPE:
      return profile === setting.typeValue;
    default:
      return false;
  }
};

/**
 * `assignorProfile` is just a profile string, not a full `MinibadgeUser`,
 * since the caller (`AssignBadgeLightbox`) only has the current user's
 * profile available.
 *
 * Not obvious from the name: when `relations` is empty (no relation
 * configured for this badge type at all), this returns `false` —
 * `receivers.some(receiver => relations.some(...))` can never be `true` if
 * the inner `.some()` has nothing to iterate. That means a badge type with
 * no relation configured always disables assignment — see
 * `relation.test.ts`'s "no relation configured" case.
 */
export const isMatchingAnyRelation = (
  assignorProfile: string | undefined,
  receivers: MinibadgeUser[] | undefined,
  relations: BadgeProtagonistSettingRelation[] | undefined,
): boolean => {
  if (!assignorProfile || !receivers || receivers.length === 0 || !relations) return false;
  return receivers.some((receiver) =>
    relations.some(
      (relation) =>
        isProtagonistValid(relation.assignorType, assignorProfile) &&
        isProtagonistValid(relation.receiverType, receiver.profile),
    ),
  );
};
