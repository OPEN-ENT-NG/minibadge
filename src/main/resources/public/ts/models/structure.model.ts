import { toLocaleString } from "../utils/number.utils";
import { translate } from "../utils/string.utils";
import { IDisplayItem } from "./display-list.model";
import { MinibadgeModel } from "./model";

export interface IStructureResponse {
    id: string;
    name: string;
    countAssigned?: number;
    countActiveUsers?: number;
}

export class Structure extends MinibadgeModel<Structure> implements IDisplayItem {
    id: string;
    name: string;
    countAssigned?: number;
    countActiveUsers?: number;

    constructor(data?: IStructureResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: IStructureResponse): Structure {
        this.id = data.id
        this.name = data.name;
        this.countAssigned = data.countAssigned;
        this.countActiveUsers = data.countActiveUsers;
        return this;
    }

    toModel(model: any): Structure {
        return new Structure(model)
    };

    displayItem = (): string => this.name;

    displayItemDistinction = (): string => {
        const optionsLabel = translate('minibadge.badges.option').toLowerCase();
        const baseText = `${toLocaleString(this.countAssigned)} ${optionsLabel}`;

        const participantsLabel = translate('minibadge.participants').toLowerCase();
        const participantsText = `${toLocaleString(this.countActiveUsers)} ${participantsLabel}`;

        return `${baseText} - ${participantsText}`;
    };
}