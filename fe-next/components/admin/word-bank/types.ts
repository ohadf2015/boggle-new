/**
 * Word Bank Types
 * Type definitions for word bank management UI
 */

import type { Language } from '@/types';

export interface WordBankWord {
  id: string;
  word: string;
  language: string;
  source: 'static' | 'dictionary' | 'wikipedia' | 'admin' | 'ai';
  status: 'active' | 'blocked' | 'used';
  times_used: number;
  last_used_at: string | null;
  blocked_reason: string | null;
  created_at: string;
}

export interface WordBankStats {
  total: number;
  active: number;
  blocked: number;
  bySource: Record<string, number>;
}

export interface WordBankFilters {
  language: Language;
  status?: 'active' | 'blocked' | 'used';
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface DeleteWordResult {
  success: boolean;
  message: string;
}
