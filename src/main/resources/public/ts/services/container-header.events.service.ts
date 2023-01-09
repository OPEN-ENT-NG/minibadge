import {Observable, Subject} from "rxjs";
import {ContainerHeader} from "../models/container-header.model";


export class ContainerHeaderEventsService {
    private ContainerHeaderSubject: Subject<ContainerHeader> = new Subject<ContainerHeader>();

    changeContainerHeader(ContainerHeader: ContainerHeader): void {
        this.ContainerHeaderSubject.next(ContainerHeader);
    }

    getContainerHeader(): Observable<ContainerHeader> {
        return this.ContainerHeaderSubject.asObservable();
    }

}