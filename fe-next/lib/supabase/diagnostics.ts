/**
 * Diagnostic utilities for troubleshooting classroom issues
 */

import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

/**
 * Check if a classroom code exists in the database
 *
 * Useful for debugging "Invalid classroom code" errors.
 * Returns detailed diagnostic information.
 */
export async function diagnosticCheckClassroomCode(joinCode: string): Promise<{
  exists: boolean;
  rawCode: string;
  normalizedCode: string;
  classroom?: {
    id: string;
    name: string;
    teacher_id: string;
    created_at: string;
  };
  suggestions?: string[];
  error?: string;
}> {
  if (!supabase) {
    return {
      exists: false,
      rawCode: joinCode,
      normalizedCode: '',
      error: 'Supabase not configured',
    };
  }

  // Normalize the code (trim + uppercase)
  const normalizedCode = joinCode.trim().toUpperCase();
  const suggestions: string[] = [];

  try {
    // Try exact match using secure RPC function
    // Note: This uses the secure lookup function that only returns matching classroom
    const { data: classroomResult, error } = await supabase
      .rpc('lookup_classroom_by_join_code', { p_join_code: normalizedCode });

    if (error) {
      logger.error('Error checking classroom code:', error);
      return {
        exists: false,
        rawCode: joinCode,
        normalizedCode,
        error: error.message,
        suggestions,
      };
    }

    // RPC returns an array, get the first result
    const classroom = Array.isArray(classroomResult) ? classroomResult[0] : classroomResult;

    if (classroom) {
      return {
        exists: true,
        rawCode: joinCode,
        normalizedCode,
        classroom: {
          id: classroom.id,
          name: classroom.name,
          teacher_id: '', // Not exposed by RPC for security
          created_at: '', // Not exposed by RPC for security
        },
      };
    }

    // Classroom not found - provide helpful suggestions
    if (normalizedCode.length !== 6) {
      suggestions.push('Code must be exactly 6 characters long');
    }

    if (!/^[A-Z0-9]+$/.test(normalizedCode)) {
      suggestions.push('Code can only contain letters (A-Z) and numbers (2-9)');
    }

    // Note: Similar code suggestions disabled for security
    // (would require access to all classroom codes which is now restricted)

    if (suggestions.length === 0) {
      suggestions.push('Double-check the code with your teacher');
      suggestions.push('Make sure there are no spaces or special characters');
    }

    return {
      exists: false,
      rawCode: joinCode,
      normalizedCode,
      suggestions,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in diagnosticCheckClassroomCode:', error);
    return {
      exists: false,
      rawCode: joinCode,
      normalizedCode,
      error,
      suggestions,
    };
  }
}

/**
 * Calculate Levenshtein distance between two strings
 * (for suggesting similar classroom codes)
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
