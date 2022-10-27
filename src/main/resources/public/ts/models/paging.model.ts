import {MinibadgeModel} from "./model";
import {IPaginatedPayload} from "./request.model";

export class Paging extends MinibadgeModel<Paging> {
    page: number;
    pageCount: number;

    constructor(data?: IPaginatedPayload) {
        super();
        if (data) this.build(data);
    }

    build(data: IPaginatedPayload): Paging {
        this.page = data.page;
        this.pageCount = data.pageCount;
        return this;
    }

    toModel(model: any): Paging {
        return new Paging(model)
    };
}