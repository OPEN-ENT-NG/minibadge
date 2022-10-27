export abstract class MinibadgeModel<I extends MinibadgeModel<I>> {

    abstract toModel(model: any): I;

    abstract build(model: any): I;

    toList = (dataList: any[]): I[] => {
        if (dataList)
            return dataList.map((data: any) => this.toModel(data))
        return [];
    }

}