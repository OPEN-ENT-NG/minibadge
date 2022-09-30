import {MinibadgeModel} from "./model";

export interface IActionOptionResponse {
    label: string;
    action: Function;
}

export class ActionOption extends MinibadgeModel<ActionOption> {
    label: string;
    action: Function;

    constructor(data?: IActionOptionResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: any): ActionOption {
        this.label = data.label
        this.action = data.action;
        return this;
    }

    toModel(model: any): ActionOption {
        return new ActionOption(model)
    };
}