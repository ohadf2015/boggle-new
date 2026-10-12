/**
 * Admin Server Utilities
 * Server-side only utilities for admin API routes
 *
 * NOTE: This file should only be imported in server-side code (API routes, server components)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import logger from '@/backend/utils/logger';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Service-role client for admin operations that bypass RLS. One shared instance
 * per process (see createAdminClient).
 *
 * @returns Supabase client or null if not configured
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const client = createAdminClient();
  if (!client) {
    logger.error('ADMIN', 'Missing Supabase environment variables');
  }
  return client;
}

/**
 * Get Supabase admin client or throw error
 * Use when database access is required (fails fast)
 *
 * @throws Error if Supabase is not configured
 * @returns Supabase client
 */
export function requireSupabaseAdmin(): SupabaseClient {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error('Database not configured');
  }
  return client;
}
