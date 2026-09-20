import { describe, expect, it, vi } from 'vitest';

import { BadgeType } from '~/models/badgeType';

import { SnipletBadgeAssignService } from './snipletBadgeAssignService';

const badgeType: BadgeType = {
  id: 1,
  label: 'Entraide',
  setting: { relations: [], isSelfAssignable: false },
  categories: [],
  isSelfAssigned: false,
};

describe('SnipletBadgeAssignService', () => {
  it('emits a BadgeType sent via sendBadgeType to subscribers of getBadgeTypeSubject', () => {
    const service = new SnipletBadgeAssignService();
    const received: BadgeType[] = [];
    const subscription = service.getBadgeTypeSubject().subscribe((type) => received.push(type));

    service.sendBadgeType(badgeType);

    expect(received).toEqual([badgeType]);
    subscription.unsubscribe();
  });

  it('emits an id sent via sendBadgeTypeId to subscribers of getBadgeTypeIdSubject', () => {
    const service = new SnipletBadgeAssignService();
    const received: number[] = [];
    const subscription = service.getBadgeTypeIdSubject().subscribe((id) => received.push(id));

    service.sendBadgeTypeId(42);

    expect(received).toEqual([42]);
    subscription.unsubscribe();
  });

  it('the two subjects are independent: sending one never notifies the other', () => {
    const service = new SnipletBadgeAssignService();
    const idCallback = vi.fn();
    service.getBadgeTypeIdSubject().subscribe(idCallback);

    service.sendBadgeType(badgeType);

    expect(idCallback).not.toHaveBeenCalled();
  });

  it('stops delivering values to a subscriber that unsubscribed', () => {
    const service = new SnipletBadgeAssignService();
    const callback = vi.fn();
    const subscription = service.getBadgeTypeIdSubject().subscribe(callback);
    subscription.unsubscribe();

    service.sendBadgeTypeId(7);

    expect(callback).not.toHaveBeenCalled();
  });

  it('does not replay a value emitted before a subscriber subscribed (Subject, not ReplaySubject)', () => {
    const service = new SnipletBadgeAssignService();
    service.sendBadgeTypeId(1);
    const callback = vi.fn();
    service.getBadgeTypeIdSubject().subscribe(callback);

    expect(callback).not.toHaveBeenCalled();
  });
});
