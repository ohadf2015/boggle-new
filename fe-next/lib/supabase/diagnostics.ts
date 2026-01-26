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
    // Try exact match first
    const { data: classroom, error } = await supabase
      .from('classrooms')
      .select('id, name, teacher_id, created_at')
      .eq('join_code', normalizedCode)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is not an error
      logger.error('Error checking classroom code:', error);
      return {
        exists: false,
        rawCode: joinCode,
        normalizedCode,
        error: error.message,
        suggestions,
      };
    }

    if (classroom) {
      return {
        exists: true,
        rawCode: joinCode,
        normalizedCode,
        classroom,
      };
    }

    // Classroom not found - provide helpful suggestions
    if (normalizedCode.length !== 6) {
      suggestions.push('Code must be exactly 6 characters long');
    }

    if (!/^[A-Z0-9]+$/.test(normalizedCode)) {
      suggestions.push('Code can only contain letters (A-Z) and numbers (2-9)');
    }

    // Check for similar codes (Levenshtein distance = 1)
    const { data: similarCodes } = await supabase
      .from('classrooms')
      .select('join_code')
      .limit(100);

    if (similarCodes && similarCodes.length > 0) {
      const similar = similarCodes
        .map(c => c.join_code)
        .filter(code => levenshteinDistance(normalizedCode, code) === 1)
        .slice(0, 3);

      if (similar.length > 0) {
        suggestions.push(`Did you mean: ${similar.join(', ')}?`);
      }
    }

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
