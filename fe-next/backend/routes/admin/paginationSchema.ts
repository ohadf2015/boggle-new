/**
 * Shared pagination schema for admin API endpoints.
 * Validates and coerces query params into safe pagination values.
 */

import { z } from 'zod';

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  cursor: z.string().optional(),
});

export type PaginationParams = z.infer<typeof paginationSchema>;
