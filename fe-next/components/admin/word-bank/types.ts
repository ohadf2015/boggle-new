/**
 * Word Bank Types
 * Type definitions for word bank management UI
 */

import type { Language } from '@/types';

/** Validation status for words (especially Wikipedia-sourced) */
export type ValidationStatus = 'pending' | 'approved' | 'rejected';

export interface WordBankWord {
  id: string;
  word: string;
  language: string;
  source: 'static' | 'dictionary' | 'wikipedia' | 'admin' | 'ai';
  status: 'active' | 'blocked' | 'used';
  validation_status: ValidationStatus;
  times_used: number;
  last_used_at: string | null;
  blocked_reason: string | null;
  created_at: string;
  source_article_title: string | null;
  source_article_url: string | null;
  interestingness_score: number | null;
}

export interface WordBankStats {
  total: number;
  active: number;
  blocked: number;
  bySource: Record<string, number>;
  pending: number;
  approved: number;
  rejected: number;
}

export interface WordBankFilters {
  language: Language;
  status?: 'active' | 'blocked' | 'used';
  validation_status?: ValidationStatus;
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface DeleteWordResult {
  success: boolean;
  message: string;
}

export interface BulkActionResult {
  success: boolean;
  affected: number;
  errors: Array<{ id: string; error: string }>;
}

export interface BulkImportResult {
  imported: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ word: string; error: string }>;
}
