/**
 * Remotion Font Configuration
 *
 * Fonts are already loaded globally by Next.js via next/font/local (app/fonts.ts).
 * This module exports the font family names for use in Remotion cinematic styles.
 *
 * Previously used @remotion/google-fonts which bundled the entire fontkit engine (~1.6MB).
 * Replaced with direct font family references since fonts are already available in the browser.
 */

// ==============================================
// FONT FAMILIES
// ==============================================

/**
 * Fredoka font family (display/heading font)
 * Used for: Victory text, boss names, titles, scores
 * Loaded globally via --font-fredoka CSS variable
 */
export const fredokaFamily = 'var(--font-fredoka), Fredoka, sans-serif';

/**
 * Rubik font family (body font)
 * Used for: Stats labels, messages, body text
 * Loaded globally via --font-rubik CSS variable
 */
export const rubikFamily = 'var(--font-rubik), Rubik, sans-serif';

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

/**
 * Wait for all cinematic fonts to be loaded.
 * Uses the document.fonts API to check font availability.
 *
 * Since fonts are preloaded by Next.js, this typically resolves immediately.
 *
 * @example
 * const handle = delayRender("Loading fonts");
 * await waitForAllFonts();
 * continueRender(handle);
 */
export async function waitForAllFonts(): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }
}

export const waitForFredoka = waitForAllFonts;
export const waitForRubik = waitForAllFonts;
