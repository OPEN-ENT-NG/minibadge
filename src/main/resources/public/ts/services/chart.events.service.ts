import {Observable, Subject} from "rxjs";
import {Chart} from "../models/chart.model";


export class ChartEventsService {
    private chartSubject: Subject<Chart> = new Subject<Chart>();

    validateChart(chart: Chart): void {
        this.chartSubject.next(chart);
    }

    getChart(): Observable<Chart> {
        return this.chartSubject.asObservable();
    }

}