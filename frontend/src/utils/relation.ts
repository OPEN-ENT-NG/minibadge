import { BadgeProtagonistSetting, BadgeProtagonistSettingRelation } from '~/models/badgeType';
import { MinibadgeUser } from '~/models/user';

/**
 * Pure-TS mirror of `TypeSettings.isMatchingAnyRelation` + `ProtagonistSetting.isValid`
 * (backend `type-settings.model.ts` + `protagonist-setting.model.ts`).
 *
 * Only the `PROFILE` protagonist type is supported today — verified in
 * `protagonist-setting.model.ts#isValid`'s `switch (this.type) { case
 * PROTAGONIST_TYPES.PROFILE: ...; default: return false; }`. `PROTAGONIST_TYPES.PROFILE`
 * is the literal string `'profile'` (`core/enum/protagonist-types.enum.ts`) — this is
 * DB-seeded configuration data (`BadgeProtagonistSetting.type`, a free-form string
 * column on the backend, per `BadgeProtagonistSetting.java`), so `'profile'` is
 * hardcoded here as the one value the real app ever actually matches against, exactly
 * as the Angular source does. A future `type` value the backend might start sending
 * would silently fall through to `false` on BOTH the original AngularJS app and this
 * port — an accepted, iso-functional limitation (see the plan's Risks table), not a
 * regression introduced here.
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
 * Mirrors `TypeSettings.isMatchingAnyRelation(assignor, receivers)` exactly,
 * `assignor` narrowed to just its `profile` (the only field `ProtagonistSetting.isValid`
 * ever reads from it) since the caller (`AssignBadgeLightbox`) only has the CURRENT
 * user's profile available, not a full `MinibadgeUser`.
 *
 * NOTE (verified, not obvious from the name): when `relations` is empty (no relation
 * configured for this badge type at all), this returns `false` — `receivers.some(receiver
 * => relations.some(...))` can never be `true` if the inner `.some()` has nothing to
 * iterate. This is the real AngularJS behavior (`badge-assign.sniplet.ts#isNotAssignable`
 * would then always disable the "Décerner" button for such a badge type), faithfully
 * ported as-is — see `relation.test.ts`'s "no relation configured" case.
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
