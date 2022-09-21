import {Observable, Subject} from "rxjs";
import {BadgeType} from "../models/badge-type.model";


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