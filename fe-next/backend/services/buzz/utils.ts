/**
 * Utility functions for Daily Buzz
 * Common helpers used across buzz modules
 */

/**
 * Wraps a promise with a timeout
 * Throws a descriptive error if the operation exceeds the specified duration
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(
        `${operationName} timed out after ${timeoutMs / 1000}s. ` +
        `The AI model may be overloaded. Please try again in a few minutes.`
      ));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Check if a word looks like a proper noun (capitalized brand/name)
 */
export function isBrandOrProperNoun(word: string, bannedBrands: Set<string>): boolean {
  const upper = word.toUpperCase();
  return bannedBrands.has(upper);
}

/**
 * Attempt to repair truncated JSON by closing open structures
 * This handles cases where AI response is cut off mid-generation
 */
export function repairTruncatedJson(jsonText: string): string {
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escapeNext = false;

  for (const char of jsonText) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') openBraces++;
    if (char === '}') openBraces--;
    if (char === '[') openBrackets++;
    if (char === ']') openBrackets--;
  }

  // If we ended inside a string, close it
  if (inString) {
    jsonText += '"';
  }

  // Find last complete challenge object by looking for last complete "trending_context"
  const lastCompleteChallenge = jsonText.lastIndexOf('"trending_context"');
  if (lastCompleteChallenge > 0) {
    const afterContext = jsonText.indexOf('"', lastCompleteChallenge + 18);
    if (afterContext > 0) {
      const closingQuote = jsonText.indexOf('"', afterContext + 1);
      if (closingQuote > 0) {
        const afterClosingQuote = closingQuote + 1;
        let braceCount = 0;
        let foundClose = -1;
        for (let i = afterClosingQuote; i < jsonText.length; i++) {
          if (jsonText[i] === '{') braceCount++;
          if (jsonText[i] === '}') {
            if (braceCount === 0) {
              foundClose = i;
              break;
            }
            braceCount--;
          }
        }
        if (foundClose > 0) {
          jsonText = jsonText.substring(0, foundClose + 1) + ']}';
          console.log('[BUZZ] Repaired truncated JSON by finding last complete challenge');
          return jsonText;
        }
      }
    }
  }

  // Fallback: close remaining brackets/braces
  jsonText += ']'.repeat(Math.max(0, openBrackets));
  jsonText += '}'.repeat(Math.max(0, openBraces));

  console.log('[BUZZ] Repaired truncated JSON with bracket closing');
  return jsonText;
}
