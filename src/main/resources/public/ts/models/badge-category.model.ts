import { MinibadgeModel } from "./model";

export interface IBadgeCategoryResponse {
    id: number;
    name: string;
    slug: string;
    iconName: string;
    iconCssClass: string;
}

export class BadgeCategory extends MinibadgeModel<BadgeCategory> {
    id: number;
    name: string;
    slug: string;
    iconName: string;
    iconCssClass: string;

    constructor(data?: IBadgeCategoryResponse) {
        super();
        if (data) this.build(data);
    }

    build(data: IBadgeCategoryResponse): BadgeCategory {
        this.id = data.id;
        this.name = data.name;
        this.slug = data.slug;
        this.iconName = data.iconName;
        this.iconCssClass = data.iconCssClass;
        return this;
    }

    toModel(model: any): BadgeCategory {
        return new BadgeCategory(model)
    };
}
