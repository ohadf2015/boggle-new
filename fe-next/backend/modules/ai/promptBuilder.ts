/**
 * Prompt Builder
 *
 * Constructs prompts for word validation and themed board generation.
 */

import { LANGUAGE_NAMES } from './types.js';

/**
 * Build the word validation prompt for a single word
 */
export function buildSingleWordPrompt(word: string, language: string): string {
  const languageName = LANGUAGE_NAMES[language] || language;
  const isHebrew = language === 'he';

  // Hebrew-specific instruction for final letter forms
  const hebrewNote = isHebrew
    ? `
IMPORTANT FOR HEBREW: The game board does NOT have final Hebrew letters (sofit: ך, ם, ן, ף, ץ).
Players type using regular letters (כ, מ, נ, פ, צ) even at word endings.
Treat words with regular letters at the end as if they had final letters.
Example: "שלומ" should be validated as "שלום" (valid word).
`
    : '';

  // Response language instruction
  const responseNote = `
RESPONSE: Provide "reason" in ${languageName}. Keep it brief (under 10 words).`;

  return `You are a word validator for a Boggle word game. Be FAIR but filter out gibberish.

LANGUAGE: ${languageName} (${language})
WORD: "${word}"
${hebrewNote}
VALIDATION RULES:
1. ACCEPT: Real words in ${languageName} dictionaries
2. ACCEPT: Common nouns, verbs (any conjugation), adjectives, adverbs
3. ACCEPT: Plural forms and verb conjugations
4. ACCEPT: Well-known abbreviations and acronyms (NASA, FIFA, LOL, USA, etc.)
5. ACCEPT: Popular and widely-recognized slang (cool, chill, vibe, etc.)
6. ACCEPT: Famous people's names (Einstein, Shakespeare, Mozart, etc.)
7. ACCEPT: Well-known place names (Paris, Tokyo, Amazon, etc.)
8. ACCEPT: Common brand names that became words (xerox, google, uber, etc.)
9. REJECT: Random letter combinations that don't mean anything
10. REJECT: Made-up nonsense words
11. REJECT: Obvious misspellings
12. REJECT: Words with spaces, hyphens, apostrophes

CONFIDENCE (0-100):
- 95-100: Very common word or well-known term
- 85-94: Recognized word, name, or slang
- 70-84: Valid but less common
- Below 70: Uncertain - REJECT
${responseNote}

Respond with ONLY valid JSON (no markdown):
{"isValid": boolean, "reason": "brief ${languageName} explanation", "confidence": number}`;
}

/**
 * Build the batch validation prompt for multiple words
 */
export function buildBatchPrompt(words: string[], language: string): string {
  const languageName = LANGUAGE_NAMES[language] || language;
  const isHebrew = language === 'he';
  const wordList = words.map((w, i) => `${i + 1}. "${w}"`).join('\n');

  const hebrewNote = isHebrew
    ? `
HEBREW NOTE: Game board has no final letters (ך,ם,ן,ף,ץ). Treat regular letters at word end as final forms.
`
    : '';

  return `You are a word validator for a Boggle game. Validate ALL ${words.length} words in ${languageName}. Be FAIR but filter gibberish.

WORDS:
${wordList}
${hebrewNote}
RULES:
1. ACCEPT: Real ${languageName} words, nouns, verbs, adjectives, adverbs, plurals
2. ACCEPT: Well-known abbreviations/acronyms (NASA, FIFA, LOL, etc.)
3. ACCEPT: Popular slang and informal words
4. ACCEPT: Famous names (people, places, brands that became words)
5. REJECT: Random letter combinations, made-up nonsense
6. REJECT: Obvious misspellings

CONFIDENCE: 95-100=common, 85-94=recognized, 70-84=valid but rare, <70=REJECT

Respond with ONLY a JSON array (no markdown), one object per word in order:
[{"word": "string", "isValid": boolean, "reason": "brief ${languageName} text", "confidence": number}]`;
}

/**
 * Build the themed board generation prompt
 */
export function buildThemedBoardPrompt(
  theme: string,
  count: number,
  language: string
): string {
  const languageName = LANGUAGE_NAMES[language] || language;

  return `Generate a JSON array of ${count} distinct words related to the theme '${theme}' in ${languageName}. Words must be between 3 to 10 letters long. No spaces, no hyphens. Output raw JSON only.`;
}
