export interface IPaginatedResponse<I> {
    page?: number;
    pageCount?: number;
    limit?: number;
    offset?: number;
    all: I[];
}


export interface ILimitOffsetPayload {
    query?: string;
    limit?: number;
    offset: number;
}

export interface IPaginatedSearchPayload {
    query?: string;
    page: number;
}
