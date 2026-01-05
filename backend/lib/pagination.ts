import { z } from "zod/v4";

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export function paginate<T>(items: T[], page: number, limit: number): PaginatedResponse<T> {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const data = items.slice(offset, offset + limit);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export function paginateWithOffset<T>(items: T[], total: number, page: number, limit: number): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export function getOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}
