import { ThresholdSetting } from '~/models/config';

/**
 * Every function here defaults missing numeric fields to `0`, since
 * `ThresholdSetting`'s fields are optional (`maxAssignable?: number`) rather
 * than normalized at parse time.
 *
 * `isThresholdOutmoded` (strict `>`) is NOT the same thing as
 * `isThresholdReached` (`>=`) — easy to conflate since both sound like "is
 * this threshold hit":
 * - `isThresholdOutmoded` / `areThresholdsOutmoded`: gates the "Décerner"
 *   button in the shared assign lightbox.
 * - `isThresholdReached` / `areThresholdsReached`: only a visual warning
 *   next to the remaining-quota label — it never disables anything.
 *
 * A third, easy-to-miss variant: `AssignMyselfModal`'s "Me décerner"
 * confirmation disables when `assignableNumbers(0) <= 0` — passing `0` as
 * `addingNumber` even though assigning to myself adds exactly one
 * assignation. Algebraically, `assignableNumbers(0) <= 0` ⟺
 * `maxAssignable - assignationsNumber <= 0` ⟺
 * `assignationsNumber >= maxAssignable` ⟺ `isThresholdReached(0)` — so that
 * modal's disable condition is actually the REACHED (`>=`) variant, not the
 * OUTMODED (`>`) one the shared lightbox uses. Don't assume it matches the
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

export const areThresholdsReached = (thresholds: ThresholdSetting[], addingNumber = 0): boolean =>
  thresholds.some((threshold) => isThresholdReached(threshold, addingNumber));

export const areThresholdsOutmoded = (thresholds: ThresholdSetting[], addingNumber = 0): boolean =>
  thresholds.some((threshold) => isThresholdOutmoded(threshold, addingNumber));

/** Joins every threshold's remaining count with `, `. */
export const assignableNumbersLabel = (thresholds: ThresholdSetting[], addingNumber = 0): string =>
  thresholds.map((threshold) => assignableNumbers(threshold, addingNumber)).join(', ');
