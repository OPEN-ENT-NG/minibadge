import { Observable, Subject } from 'rxjs';

import { BadgeType } from '~/models/badgeType';

/**
 * A portal page (or another app) calls
 * `Behaviours.applicationsBehaviours['minibadge'].snipletBadgeAssignService
 *   .sendBadgeType(badgeType)` (or `.sendBadgeTypeId(id)`) to ask this
 * sniplet to open — see `main.tsx`, which instantiates and registers the
 * one instance of this service the whole bundle shares.
 */
export class SnipletBadgeAssignService {
  private badgeTypeSubject: Subject<BadgeType> = new Subject<BadgeType>();
  private badgeTypeIdSubject: Subject<number> = new Subject<number>();

  sendBadgeType(badgeType: BadgeType): void {
    this.badgeTypeSubject.next(badgeType);
  }

  getBadgeTypeSubject(): Observable<BadgeType> {
    return this.badgeTypeSubject.asObservable();
  }

  sendBadgeTypeId(badgeTypeId: number): void {
    this.badgeTypeIdSubject.next(badgeTypeId);
  }

  getBadgeTypeIdSubject(): Observable<number> {
    return this.badgeTypeIdSubject.asObservable();
  }
}
