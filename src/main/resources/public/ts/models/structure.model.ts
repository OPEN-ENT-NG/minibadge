import {MinibadgeModel} from "./model";
import {IDisplayItem} from "./display-list.model";
import {toLocaleString} from "../utils/number.utils";

export interface IStructureResponse {
    id: string;
    name: string;
    countAssigned?: number;
}

export class Structure extends MinibadgeModel<Structure> implements IDisplayItem {
    id: string;
    name: string;
    countAssigned?: number;

    constructor(data?: IStructureResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: IStructureResponse): Structure {
        this.id = data.id
        this.name = data.name;
        this.countAssigned = data.countAssigned;
        return this;
    }

    toModel(model: any): Structure {
        return new Structure(model)
    };

    displayItem = (): string => this.name;

    displayItemDistinction = (): string => toLocaleString(this.countAssigned);

}