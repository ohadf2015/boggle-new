/**
 * Script detection utility for filtering trends by language alphabet
 * Ensures trends match the expected language/script for the region
 */

// Unicode ranges for script detection
// Each pattern allows the expected script + common punctuation + numbers
const SCRIPT_PATTERNS = {
  // Hebrew alphabet (0590-05FF) + common Latin chars + punctuation/numbers
  hebrew: /^[\u0590-\u05FF\s\d\-'",.!?:;()A-Za-z0-9%&@#]+$/,
  // Latin alphabet + accented characters (Swedish åäö, Spanish ñáéíóú, etc.)
  latin:
    /^[A-Za-z\s\d\-'",.!?:;()%&@#åäöÅÄÖñÑáéíóúÁÉÍÓÚüÜàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛçÇ]+$/,
  // Japanese: Hiragana (3040-309F) + Katakana (30A0-30FF) + Kanji (4E00-9FAF) + Latin
  japanese:
    /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\sA-Za-z0-9\-'",.!?:;()%&@#]+$/,
  // Arabic characters - used for detection/rejection
  arabic: /[\u0600-\u06FF]/,
  // Cyrillic characters - used for detection/rejection in non-Russian contexts
  cyrillic: /[\u0400-\u04FF]/,
} as const;

type SupportedScript = 'hebrew' | 'latin' | 'japanese';

interface ScriptConfig {
  allowed: SupportedScript;
  reject: RegExp[];
}

// Map language codes to script configurations
const LANGUAGE_SCRIPT_CONFIG: Record<string, ScriptConfig> = {
  he: {
    allowed: 'hebrew',
    reject: [SCRIPT_PATTERNS.arabic, SCRIPT_PATTERNS.cyrillic], // Reject Arabic from Israeli trends
  },
  en: {
    allowed: 'latin',
    reject: [SCRIPT_PATTERNS.arabic, SCRIPT_PATTERNS.cyrillic],
  },
  sv: {
    allowed: 'latin',
    reject: [SCRIPT_PATTERNS.arabic, SCRIPT_PATTERNS.cyrillic],
  },
  es: {
    allowed: 'latin',
    reject: [SCRIPT_PATTERNS.arabic, SCRIPT_PATTERNS.cyrillic],
  },
  ja: {
    allowed: 'japanese',
    reject: [SCRIPT_PATTERNS.arabic, SCRIPT_PATTERNS.cyrillic],
  },
};

/**
 * Check if a text matches the expected script for a language
 * @param text - The text to check (e.g., a trend topic)
 * @param language - The language code (en, he, sv, ja, es)
 * @returns true if text is valid for the language, false otherwise
 */
export function matchesExpectedScript(text: string, language: string): boolean {
  const config = LANGUAGE_SCRIPT_CONFIG[language];
  if (!config) {
    // Allow unknown languages by default
    return true;
  }

  // Check for rejected scripts first (e.g., Arabic in Hebrew context)
  for (const rejectPattern of config.reject) {
    if (rejectPattern.test(text)) {
      return false;
    }
  }

  // Check if text matches allowed script pattern
  return SCRIPT_PATTERNS[config.allowed].test(text);
}

/**
 * Get the dominant script in a text (useful for debugging)
 * @param text - The text to analyze
 * @returns The dominant script name or 'mixed'/'unknown'
 */
export function detectDominantScript(
  text: string
): SupportedScript | 'arabic' | 'cyrillic' | 'mixed' | 'unknown' {
  const hebrewCount = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const latinCount = (text.match(/[A-Za-z]/g) || []).length;
  const japaneseCount = (
    text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []
  ).length;
  const arabicCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const cyrillicCount = (text.match(/[\u0400-\u04FF]/g) || []).length;

  const total =
    hebrewCount + latinCount + japaneseCount + arabicCount + cyrillicCount;
  if (total === 0) return 'unknown';

  const threshold = 0.5; // 50% dominance threshold
  if (hebrewCount / total >= threshold) return 'hebrew';
  if (latinCount / total >= threshold) return 'latin';
  if (japaneseCount / total >= threshold) return 'japanese';
  if (arabicCount / total >= threshold) return 'arabic';
  if (cyrillicCount / total >= threshold) return 'cyrillic';

  return 'mixed';
}

/**
 * Check if text contains any characters from a specific script
 * @param text - The text to check
 * @param script - The script to look for
 * @returns true if text contains characters from the script
 */
export function containsScript(
  text: string,
  script: 'hebrew' | 'arabic' | 'japanese' | 'cyrillic'
): boolean {
  const patterns: Record<string, RegExp> = {
    hebrew: /[\u0590-\u05FF]/,
    arabic: /[\u0600-\u06FF]/,
    japanese: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/,
    cyrillic: /[\u0400-\u04FF]/,
  };
  return patterns[script]?.test(text) ?? false;
}
