/**
 * Shared Admin Types
 * Centralizes all type definitions used across admin dashboard components
 */

import type { Language } from '@/types';

// ==================== Language Types ====================

/**
 * Language option for admin selectors
 */
export interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
}

// ==================== Validation Types ====================

/**
 * Common validation status for word/content management
 */
export type ValidationStatus = 'pending' | 'valid' | 'invalid';

/**
 * Status filter including "all" option
 */
export type ValidationStatusFilter = 'all' | ValidationStatus;

// ==================== Date Range Types ====================

/**
 * Date range for filtering
 */
export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

// ==================== API Types ====================

/**
 * Standard admin API response structure
 */
export interface AdminApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated admin API response
 */
export interface AdminPaginatedResponse<T> extends AdminApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  success: boolean;
  processed: number;
  errors: number;
  details?: string[];
}

// ==================== Async Operation State ====================

/**
 * Generic state for async operations
 * Used with useAdminOperation hook
 */
export interface AsyncOperationState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Extended state with refresh capability
 */
export interface AsyncOperationStateWithRefresh<T> extends AsyncOperationState<T> {
  isRefreshing: boolean;
  lastUpdated: Date | null;
}

// ==================== Statistics Types ====================

/**
 * Generic stats structure (total + breakdown by status)
 */
export interface AdminStats {
  total: number;
  pending: number;
  valid: number;
  invalid: number;
}

/**
 * Extended stats with additional metrics
 */
export interface AdminExtendedStats extends AdminStats {
  byLanguage?: Record<Language, number>;
  byDate?: Record<string, number>;
}

// ==================== Filter Types ====================

/**
 * Common filter structure for admin lists
 */
export interface AdminFilters {
  language: Language;
  status: ValidationStatusFilter;
  dateRange: DateRange;
  searchQuery: string;
}

/**
 * Sort configuration
 */
export interface AdminSortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

// ==================== Selection Types ====================

/**
 * State for bulk selection operations
 */
export interface BulkSelectionState {
  selectedIds: Set<string>;
  isAllSelected: boolean;
  selectAll: () => void;
  selectNone: () => void;
  toggleSelection: (id: string) => void;
  isSelected: (id: string) => boolean;
}

// ==================== Word Types ====================

/**
 * Word source type
 */
export type WordSource = 'static' | 'wikipedia' | 'ai' | 'admin' | 'community';

/**
 * Base word candidate interface
 */
export interface BaseWordCandidate {
  id: string;
  word: string;
  language: Language;
  validation_status: ValidationStatus;
  created_at: string;
}

/**
 * Wikipedia word candidate
 */
export interface WikipediaWordCandidate extends BaseWordCandidate {
  fetch_date: string;
  source_article_title: string | null;
  source_article_url: string | null;
  interestingness_score: number;
}

/**
 * Community word submission
 */
export interface CommunityWord extends BaseWordCandidate {
  submitted_by: string | null;
  submitted_at: string;
  approved_by: string | null;
  approved_at: string | null;
}

// ==================== Sync Result Types ====================

/**
 * Result of a sync operation (e.g., Wikipedia JSON sync)
 */
export interface SyncResult {
  success: boolean;
  wordCount?: number;
  languageBreakdown?: Record<string, number>;
  syncDate?: string;
  errors?: string[];
}

// ==================== Daily Word Types ====================

/**
 * Date status for calendar view
 */
export type DateStatus = 'live' | 'past' | 'missing' | 'scheduled';

/**
 * Scheduled word for daily challenges
 */
export interface ScheduledWord {
  id: string;
  puzzle_date: string;
  language: Language;
  puzzle_number: number;
  target_word: string;
  ai_selected: boolean;
  ai_reason: string | null;
  theme_context: string | null;
  override_word: string | null;
  override_by: string | null;
  override_at: string | null;
  created_at: string;
  word_source: WordSource;
  source_article_url: string | null;
}

// ==================== Hook Return Types ====================

/**
 * Base hook return type for admin data operations
 */
export interface AdminDataHookResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook result with CRUD operations
 */
export interface AdminCrudHookResult<T, CreateInput = Partial<T>, UpdateInput = Partial<T>> extends AdminDataHookResult<T[]> {
  create: (input: CreateInput) => Promise<boolean>;
  update: (id: string, input: UpdateInput) => Promise<boolean>;
  delete: (id: string) => Promise<boolean>;
}

/**
 * Hook result with bulk operations
 */
export interface AdminBulkHookResult<T> extends AdminDataHookResult<T[]> {
  bulkUpdate: (ids: string[], updates: Partial<T>) => Promise<boolean>;
  bulkDelete: (ids: string[]) => Promise<boolean>;
}
