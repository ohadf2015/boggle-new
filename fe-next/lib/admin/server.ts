/**
 * Admin Server Utilities
 * Server-side only utilities for admin API routes
 *
 * NOTE: This file should only be imported in server-side code (API routes, server components)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

import logger from '@/backend/utils/logger';

/**
 * Create Supabase admin client with service role key
 * Used for admin operations that bypass RLS
 *
 * @returns Supabase client or null if not configured
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error('ADMIN', 'Missing Supabase environment variables');
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
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
