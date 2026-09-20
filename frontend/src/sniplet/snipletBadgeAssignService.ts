import { Observable, Subject } from 'rxjs';

import { BadgeType } from '~/models/badgeType';

/**
 * Direct TS port of `backend/src/main/resources/public/ts/services/sniplet-badge-assign.service.ts`
 * (the AngularJS-era `SnipletBadgeAssignService`) — same methods, same
 * types, no behavior change. Already 100% framework-agnostic RxJS in the
 * original (see Phase 8 plan, "Faits vérifiés"), so this is a straight
 * copy, not a rewrite.
 *
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
