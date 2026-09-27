/**
 * Text-to-Speech Service using Web Speech API
 *
 * Provides pronunciation audio for vocabulary words.
 * Supports multiple languages with automatic voice selection.
 */

/**
 * Speak a word using the Web Speech API
 *
 * @param word - The word to pronounce
 * @param lang - Language code (e.g., 'en-US', 'he-IL')
 * @returns Promise that resolves to true if speech started, false if voice unavailable
 *
 * @example
 * ```typescript
 * // Speak English word
 * await speakWord('hello', 'en-US');
 *
 * // Attempt Hebrew (may return false if voice unavailable)
 * const spoken = await speakWord('שלום', 'he-IL');
 * if (!spoken) {
 *   // Show IPA fallback
 *   console.log('Voice not available, showing IPA');
 * }
 * ```
 */
export async function speakWord(word: string, lang: string, volume: number = 1.0): Promise<boolean> {
  // Check if Web Speech API is available
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    return false;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Get available voices
  const voices = window.speechSynthesis.getVoices();

  // Find appropriate voice for language
  const voice = findVoiceForLanguage(voices, lang);

  // Return false if no suitable voice found (e.g., Hebrew fallback scenario)
  if (!voice) {
    return false;
  }

  // Create utterance
  const utterance = new window.SpeechSynthesisUtterance(word);
  utterance.voice = voice;
  utterance.lang = lang;
  utterance.rate = 0.9; // Slightly slower for clarity
  utterance.pitch = 1.0;
  utterance.volume = Math.max(0, Math.min(1, volume));

  // Return promise that resolves when speech completes
  return new Promise((resolve, reject) => {
    utterance.onend = () => resolve(true);
    utterance.onerror = (event) => reject(new Error(`Speech error: ${event.type}`));

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Get list of available voices
 *
 * @returns Array of available SpeechSynthesisVoice objects
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!window.speechSynthesis) {
    return [];
  }

  return window.speechSynthesis.getVoices();
}

/**
 * Cancel current speech
 *
 * Interrupts any ongoing speech synthesis.
 */
export function cancelSpeech(): void {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Find appropriate voice for language
 *
 * Strategy:
 * 1. Try exact match (e.g., 'en-US' matches 'en-US')
 * 2. Try prefix match (e.g., 'en-GB' matches 'en-US')
 * 3. Return null if no match found
 *
 * @param voices - Available voices
 * @param lang - Target language code
 * @returns Matching voice or null
 */
function findVoiceForLanguage(
  voices: SpeechSynthesisVoice[],
  lang: string
): SpeechSynthesisVoice | null {
  if (voices.length === 0) {
    return null;
  }

  const targetLang = lang.toLowerCase();
  const targetPrefix = targetLang.split('-')[0];

  // Try exact match first
  let exactMatch = voices.find(
    (voice) => voice.lang.toLowerCase() === targetLang
  );
  if (exactMatch) {
    return exactMatch;
  }

  // Try prefix match (e.g., 'en-GB' matches 'en-US')
  let prefixMatch = voices.find(
    (voice) => voice.lang.toLowerCase().startsWith(targetPrefix)
  );
  if (prefixMatch) {
    return prefixMatch;
  }

  // No suitable voice found
  return null;
}
