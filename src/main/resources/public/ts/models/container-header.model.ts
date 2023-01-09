import {MinibadgeModel} from "./model";
import {ActionOption, IActionOptionResponse} from "./action-option.model";

export interface IContainerHeaderResponse {
    label: string;
    buttons?: IActionOptionResponse[];
}

export class ContainerHeader extends MinibadgeModel<ContainerHeader> {
    label: string;
    buttons?: ActionOption[];

    constructor(data?: IContainerHeaderResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: any): ContainerHeader {
        this.label = data.label;
        this.buttons = new ActionOption().toList(data.buttons);
        return this;
    }

    toModel(model: any): ContainerHeader {
        return new ContainerHeader(model);
    };
}