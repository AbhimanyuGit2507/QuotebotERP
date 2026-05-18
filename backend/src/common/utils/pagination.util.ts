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

export function parsePaginationParams(query: any): { skip: number; take: number; page: number; pageSize: number } {
  const page = Math.max(1, parseInt(query?.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query?.pageSize) || 20));
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}
