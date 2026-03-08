/**
 * Parse page and pageSize from URL search params with safe defaults.
 */
export function parsePagination(
  searchParams: URLSearchParams,
  defaults: { pageSize?: number; maxPageSize?: number } = {}
): { page: number; pageSize: number } {
  const { pageSize: defaultSize = 20, maxPageSize = 50 } = defaults;

  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawSize = parseInt(
    searchParams.get("pageSize") || String(defaultSize),
    10
  );
  const pageSize =
    Number.isFinite(rawSize) && rawSize > 0
      ? Math.min(rawSize, maxPageSize)
      : defaultSize;

  return { page, pageSize };
}

/**
 * Build the pagination metadata object for API responses.
 */
export function paginationMeta(
  total: number,
  page: number,
  pageSize: number
) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}
