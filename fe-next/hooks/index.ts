/**
 * Custom Hooks Barrel Export
 * Centralized export for all custom React hooks
 */

// Game hooks
export { usePresence } from './usePresence';
export { useValidation } from './useValidation';
export { useWinStreak } from './useWinStreak';
export { useHints } from './useHints';

// Data hooks (Supabase realtime)
export {
  useLeaderboard,
  useUserRank,
  useProfile,
  useGameHistory,
  usePlayerSearch,
  useGameRoom,
  useConnectionHealth,
} from './useSupabaseRealtime';
