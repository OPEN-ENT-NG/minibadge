import { ThresholdSetting } from '~/models/config';

/**
 * Pure-TS mirror of `ThresholdSetting`/`Setting` (backend `threshold-setting.model.ts`
 * + `setting.model.ts`). Every function here defaults missing numeric fields to `0`,
 * mirroring `ThresholdSetting.build()`'s `data.maxAssignable || 0` /
 * `data.assignationsNumber || 0` — our React `ThresholdSetting` model (Phase 1,
 * `~/models/config.ts`) leaves these fields optional (`maxAssignable?: number`)
 * rather than normalizing them at parse time, so the normalization happens here
 * instead, at the point of use.
 *
 * GOTCHA (plan Task 1, explicitly flagged as an easy mistake): `isThresholdOutmoded`
 * (strict `>`) is NOT the same thing as `isThresholdReached` (`>=`). The real
 * AngularJS app uses them for two genuinely different purposes:
 * - `isThresholdOutmoded` / `areThresholdsOutmoded`: gates the "Décerner" button
 *   in the shared assign lightbox (`badge-assign.sniplet.ts#isNotAssignable`).
 * - `isThresholdReached` / `areThresholdsReached`: only a visual warning class
 *   (`minibadge-assign-footer-warning`) next to the remaining-quota label in that
 *   same lightbox (`sniplet-badge-assign.html:28`) — it never disables anything.
 *
 * A THIRD, easy-to-miss variant was found while implementing `AssignMyselfModal`
 * (Task 6): the "Me décerner" confirmation's own disable condition
 * (`badge-assign-myself.html:25`, `ng-disabled="vm.numberAssignable <= 0 || ..."`)
 * binds `numberAssignable` to `setting.assignableNumbers(0)` (addingNumber = 0,
 * NOT 1, even though assigning to myself adds exactly one assignation) and disables
 * when that is `<= 0`. Algebraically, `assignableNumbers(0) <= 0` ⟺
 * `maxAssignable - assignationsNumber <= 0` ⟺ `assignationsNumber >= maxAssignable`
 * ⟺ `isThresholdReached(0)` — so that modal's disable condition is actually the
 * REACHED (`>=`) variant, not the OUTMODED (`>`) one the shared lightbox uses.
 * Ported faithfully as such in `AssignMyselfModal`, not assumed to match the
 * shared lightbox's logic just because both are "an assign button".
 */
const maxAssignableOf = (threshold: ThresholdSetting): number => threshold.maxAssignable ?? 0;
const assignationsNumberOf = (threshold: ThresholdSetting): number => threshold.assignationsNumber ?? 0;

export const isThresholdReached = (threshold: ThresholdSetting, addingNumber = 0): boolean =>
  assignationsNumberOf(threshold) + addingNumber >= maxAssignableOf(threshold);

export const isThresholdOutmoded = (threshold: ThresholdSetting, addingNumber = 0): boolean =>
  assignationsNumberOf(threshold) + addingNumber > maxAssignableOf(threshold);

export const assignableNumbers = (threshold: ThresholdSetting, addingNumber = 0): number =>
  Math.max(maxAssignableOf(threshold) - (assignationsNumberOf(threshold) + addingNumber), 0);

/** Mirrors `Setting.areThresholdsReached` — `.some(...)` across every threshold. */
export const areThresholdsReached = (thresholds: ThresholdSetting[], addingNumber = 0): boolean =>
  thresholds.some((threshold) => isThresholdReached(threshold, addingNumber));

/** Mirrors `Setting.areThresholdsOutmoded` — `.some(...)` across every threshold. */
export const areThresholdsOutmoded = (thresholds: ThresholdSetting[], addingNumber = 0): boolean =>
  thresholds.some((threshold) => isThresholdOutmoded(threshold, addingNumber));

/** Mirrors `Setting.assignableNumbers` — joins every threshold's remaining count with `, `. */
export const assignableNumbersLabel = (thresholds: ThresholdSetting[], addingNumber = 0): string =>
  thresholds.map((threshold) => assignableNumbers(threshold, addingNumber)).join(', ');
