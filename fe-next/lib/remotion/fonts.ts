/**
 * Remotion Font Loading
 *
 * Centralized font loading for all Remotion cinematics.
 * Uses @remotion/google-fonts to ensure fonts are loaded before rendering.
 *
 * IMPORTANT: In Remotion, fonts must be loaded synchronously before any frame renders.
 * Using CSS font-family fallbacks doesn't work because Remotion needs fonts available
 * during the render phase - otherwise text appears invisible (black screen).
 */

import { loadFont as loadFredoka } from '@remotion/google-fonts/Fredoka';
import { loadFont as loadRubik } from '@remotion/google-fonts/Rubik';

// ==============================================
// FONT LOADING
// ==============================================

/**
 * Load Fredoka font (display/heading font)
 * Used for: Victory text, boss names, titles, scores
 */
export const {
  fontFamily: fredokaFamily,
  waitUntilDone: waitForFredoka,
} = loadFredoka('normal', {
  weights: ['400', '700'],
  subsets: ['latin', 'hebrew'],
});

/**
 * Load Rubik font (body font)
 * Used for: Stats labels, messages, body text
 */
export const {
  fontFamily: rubikFamily,
  waitUntilDone: waitForRubik,
} = loadRubik('normal', {
  weights: ['400', '500', '700'],
  subsets: ['latin', 'hebrew'],
});

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

/**
 * Wait for all cinematic fonts to be loaded.
 * Use this in delayRender pattern if needed.
 *
 * @example
 * const handle = delayRender("Loading fonts");
 * await waitForAllFonts();
 * continueRender(handle);
 */
export async function waitForAllFonts(): Promise<void> {
  await Promise.all([waitForFredoka(), waitForRubik()]);
}
