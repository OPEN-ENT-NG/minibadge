import {MinibadgeModel} from "./model";

export interface IActionOptionResponse {
    label: string;
    icon: string;
    action: Function;
}

export class ActionOption extends MinibadgeModel<ActionOption> {
    label: string;
    icon: string;
    action: Function;

    constructor(data?: IActionOptionResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: any): ActionOption {
        this.label = data.label;
        this.icon = data.icon;
        this.action = data.action;
        return this;
    }

    toModel(model: any): ActionOption {
        return new ActionOption(model);
    };
}