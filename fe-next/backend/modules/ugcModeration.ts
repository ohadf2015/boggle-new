/**
 * UGC Content Moderation
 * Validation and moderation utilities for user-generated content.
 */

import { isProfane } from '../utils/profanityFilter';

export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'flagged';
export type ReportReason = 'inappropriate' | 'spam' | 'unplayable' | 'offensive';

export const REPORT_REASONS: ReportReason[] = ['inappropriate', 'spam', 'unplayable', 'offensive'];
export const AUTO_FLAG_THRESHOLD = 3;

export interface ValidationResult {
  valid: boolean;
  error?: 'profanity' | 'too_long' | 'too_short' | 'empty';
  field?: string;
}

export function validateUgcText(
  text: string | null | undefined,
  field: string,
  maxLength: number
): ValidationResult {
  if (!text || !text.trim()) return { valid: false, error: 'empty', field };
  if (text.trim().length < 3) return { valid: false, error: 'too_short', field };
  if (text.length > maxLength) return { valid: false, error: 'too_long', field };
  if (isProfane(text)) return { valid: false, error: 'profanity', field };
  return { valid: true };
}

export function shouldAutoFlag(reportCount: number): boolean {
  return reportCount >= AUTO_FLAG_THRESHOLD;
}

export function getReportReasons(): ReportReason[] {
  return [...REPORT_REASONS];
}
