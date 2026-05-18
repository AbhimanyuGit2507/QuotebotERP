export interface PaginationParams {
    page?: number;
    pageSize?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResult<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
}
export declare function parsePaginationParams(query: any): {
    skip: number;
    take: number;
    page: number;
    pageSize: number;
};
