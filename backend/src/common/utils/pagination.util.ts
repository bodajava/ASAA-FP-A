export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function getPaginationArgs(options: PaginationOptions) {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(Math.max(1, options.limit ?? 20), 1000);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function paginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
