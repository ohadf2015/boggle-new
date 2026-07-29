/**
 * Supabase Server Client
 *
 * BACKWARD COMPATIBILITY LAYER
 * This file re-exports all functionality from the modular supabase/ directory.
 * New code should import directly from './supabase' or specific modules.
 *
 * Example:
 *   // Old (still works)
 *   const { getSupabase, processGameResults } = require('./supabaseServer');
 *
 *   // New (preferred)
 *   import { getSupabase, processGameResults } from './supabase';
 */

// Re-export all types and functions from the modular structure
export * from './supabase';

// CommonJS exports for backward compatibility
module.exports = require('./supabase');
