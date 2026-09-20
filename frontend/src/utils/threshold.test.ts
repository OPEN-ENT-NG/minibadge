import { describe, expect, it } from 'vitest';

import { ThresholdSetting } from '~/models/config';
import {
  areThresholdsOutmoded,
  areThresholdsReached,
  assignableNumbers,
  assignableNumbersLabel,
  isThresholdOutmoded,
  isThresholdReached,
} from '~/utils/threshold';

const threshold = (maxAssignable: number, assignationsNumber: number): ThresholdSetting => ({
  structureId: 'd4c3b2a1',
  maxAssignable,
  periodAssignable: 'DAY',
  assignationsNumber,
});

describe('isThresholdReached vs isThresholdOutmoded (plan Task 1 gotcha)', () => {
  it('isThresholdReached uses >= : reached exactly at the max, before it is outmoded', () => {
    const exactlyAtMax = threshold(3, 3);
    expect(isThresholdReached(exactlyAtMax)).toBe(true);
    expect(isThresholdOutmoded(exactlyAtMax)).toBe(false);
  });

  it('isThresholdOutmoded uses > : only true once strictly over the max', () => {
    const overMax = threshold(3, 4);
    expect(isThresholdReached(overMax)).toBe(true);
    expect(isThresholdOutmoded(overMax)).toBe(true);
  });

  it('neither is true comfortably under the max', () => {
    const underMax = threshold(3, 1);
    expect(isThresholdReached(underMax)).toBe(false);
    expect(isThresholdOutmoded(underMax)).toBe(false);
  });

  it('accounts for addingNumber (the number of new assignations about to happen)', () => {
    const almostFull = threshold(3, 2);
    expect(isThresholdOutmoded(almostFull, 1)).toBe(false); // 2+1=3, not > 3
    expect(isThresholdReached(almostFull, 1)).toBe(true); // 2+1=3, >= 3
    expect(isThresholdOutmoded(almostFull, 2)).toBe(true); // 2+2=4 > 3
  });

  it('defaults missing maxAssignable/assignationsNumber to 0, mirroring ThresholdSetting.build()', () => {
    const empty: ThresholdSetting = {};
    expect(isThresholdReached(empty)).toBe(true); // 0 >= 0
    expect(isThresholdOutmoded(empty)).toBe(false); // 0 > 0 is false
  });
});

describe('assignableNumbers', () => {
  it('returns the remaining quota, floored at 0', () => {
    expect(assignableNumbers(threshold(3, 1))).toBe(2);
    expect(assignableNumbers(threshold(3, 3))).toBe(0);
    expect(assignableNumbers(threshold(3, 5))).toBe(0); // never negative
  });

  it('accounts for addingNumber', () => {
    expect(assignableNumbers(threshold(3, 1), 2)).toBe(0);
  });
});

describe('areThresholdsReached / areThresholdsOutmoded (aggregated with .some())', () => {
  it('is true if ANY threshold in the list is reached/outmoded', () => {
    const thresholds = [threshold(10, 1), threshold(3, 3)];
    expect(areThresholdsReached(thresholds)).toBe(true);
    expect(areThresholdsOutmoded(thresholds)).toBe(false);
  });

  it('is false when every threshold is comfortably under its max', () => {
    const thresholds = [threshold(10, 1), threshold(5, 1)];
    expect(areThresholdsReached(thresholds)).toBe(false);
    expect(areThresholdsOutmoded(thresholds)).toBe(false);
  });

  it('is false for an empty threshold list (no structures configured)', () => {
    expect(areThresholdsReached([])).toBe(false);
    expect(areThresholdsOutmoded([])).toBe(false);
  });
});

describe('assignableNumbersLabel', () => {
  it('joins every threshold’s remaining count with ", "', () => {
    expect(assignableNumbersLabel([threshold(3, 1), threshold(5, 4)])).toBe('2, 1');
  });

  it('returns an empty string for an empty threshold list', () => {
    expect(assignableNumbersLabel([])).toBe('');
  });
});
