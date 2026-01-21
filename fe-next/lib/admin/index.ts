/**
 * Admin Library - Barrel Export
 * Centralizes admin dashboard shared utilities
 *
 * Usage:
 * import { ADMIN_LANGUAGES, LanguageOption, getLanguageFlag } from '@/lib/admin';
 */

// Types
export type {
  LanguageOption,
  ValidationStatus,
  ValidationStatusFilter,
  DateRange,
  AdminApiResponse,
  AdminPaginatedResponse,
  BatchOperationResult,
  AsyncOperationState,
  AsyncOperationStateWithRefresh,
  AdminStats,
  AdminExtendedStats,
  AdminFilters,
  AdminSortConfig,
  BulkSelectionState,
  WordSource,
  BaseWordCandidate,
  WikipediaWordCandidate,
  CommunityWord,
  SyncResult,
  DateStatus,
  ScheduledWord,
  AdminDataHookResult,
  AdminCrudHookResult,
  AdminBulkHookResult,
} from './types';

// Constants
export {
  ADMIN_LANGUAGES,
  CORE_LANGUAGES,
  MIN_WORD_LENGTH,
  WORD_LENGTH_RANGE,
  VALIDATION_STATUS_OPTIONS,
  ADMIN_API_TIMEOUT,
  ADMIN_PAGE_SIZE,
  DEFAULT_DATE_RANGE_DAYS,
} from './constants';

// Utility functions
export {
  getTodayDateString,
  getDefaultDateRange,
  formatDateShort,
  formatDateWithLabel,
  isToday,
  isPastDate,
  getLanguageByCode,
  getLanguageFlag,
  getLanguageName,
} from './constants';
