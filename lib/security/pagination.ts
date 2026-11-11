export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;
export const MAX_PAGE = 100;

export type Pagination = { page: number; pageSize: number; skip: number; take: number };

function parsePositiveInteger(value: string | null, fallback: number): number | null {
  if (value === null) return fallback;
  if (!/^[1-9]\\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * Bounded offset pagination for private collection APIs.
 * Returns null for malformed values or offsets beyond the supported window.
 */
export function parseBoundedPagination(searchParams: URLSearchParams): Pagination | null {
  const page = parsePositiveInteger(searchParams.get("page"), 1);
  const pageSize = parsePositiveInteger(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);

  if (page === null || pageSize === null || page > MAX_PAGE || pageSize > MAX_PAGE_SIZE) {
    return null;
  }

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
