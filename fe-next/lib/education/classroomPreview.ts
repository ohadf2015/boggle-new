import logger from '@/utils/logger';

export interface ClassroomPreview {
  id: string;
  name: string;
  language: string;
}

/**
 * Look up classroom preview info by join code
 * Called before student submission to show confirmation
 *
 * Returns preview object if found, null if not found or error
 * Handles rate limiting on backend
 */
export async function lookupClassroomPreview(code: string): Promise<ClassroomPreview | null> {
  try {
    const normalizedCode = code.trim().toUpperCase();

    // Validate on client before API call
    if (!normalizedCode || normalizedCode.length !== 6) {
      return null;
    }

    if (!/^[A-Z0-9]+$/.test(normalizedCode)) {
      return null;
    }

    const response = await fetch(`/api/education/classroom/preview?code=${encodeURIComponent(normalizedCode)}`);

    if (!response.ok) {
      // 404, 400, 429, etc. — all mean no preview available
      return null;
    }

    const data = await response.json();
    return data as ClassroomPreview;
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in lookupClassroomPreview:', error);
    return null;
  }
}
