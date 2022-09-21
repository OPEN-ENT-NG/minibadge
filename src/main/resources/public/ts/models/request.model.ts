export interface IPaginatedResponses<I> {
    page?: number;
    pageCount?: number;
    limit?: number;
    offset?: number;
    all: I[];
}


export interface IQueryStringPayload {
    query?: string;
}

export interface ILimitOffsetPayload extends IQueryStringPayload {
    limit?: number;
    offset: number;
}

export interface IPaginatedPayload extends IQueryStringPayload {
    page: number;
}
