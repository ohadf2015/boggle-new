/**
 * Brand style DNA for Higgsfield avatar generation (Track A — curated roster).
 *
 * Single source of truth so every generated asset reads as ONE family.
 * See docs/superpowers/specs/2026-06-20-higgsfield-avatar-system-design.md
 */

/** Locked neo-brutalist-kawaii style descriptor applied to every roster asset. */
export const BRAND_STYLE = [
  'Kawaii character mascot portrait',
  'bold clean vector-illustration style',
  'thick confident black outlines',
  'flat punchy cel shading',
  'neo-brutalist party-game aesthetic',
  'vibrant electric palette (lime #BFFF00, hot pink #FF1493, cyan #00FFFF, purple #8B5CF6)',
  'hard-edged not soft, no gradients',
  'expressive friendly face with personality',
  'centered bust framing',
  'solid flat single-color background',
  'high contrast',
  'sticker-ready',
].join(', ');

/**
 * Per-mascot identity descriptors. Keys MUST match ids in
 * fe-next/utils/avatarConfig.ts so promotion can map 1:1.
 */
export const MASCOT_DESCRIPTORS = {
  'broccoli-bob': 'a cheerful broccoli character',
  'drippy-drop': 'a cute water droplet character',
  'sunny-steve': 'a beaming smiling sun character',
  'cloudy-carl': 'a fluffy happy cloud character',
  'octo-otto': 'a playful octopus character',
  'pizza-pete': 'a fun pizza slice character',
  'prickly-pat': 'a friendly cactus character',
  'melon-molly': 'a juicy watermelon slice character',
  'avo-alex': 'a smooth avocado character',
  'frosty-frank': 'a cool ice cube character',
  'flaky-fred': 'a buttery croissant character',
  'eggy-ed': 'a sunny-side-up egg character',
  'slimy-sam': 'a goofy friendly slime blob character',
  'starry-stella': 'a sparkling star character',
  'shroom-shelly': 'a whimsical mushroom character',
  'donut-danny': 'a glazed donut character',
  'jelly-jen': 'a translucent jellyfish character',
};

/**
 * Build the full prompt for one mascot id.
 * @param {string} id roster id (must exist in MASCOT_DESCRIPTORS)
 * @returns {string}
 */
export function buildPrompt(id) {
  const descriptor = MASCOT_DESCRIPTORS[id];
  if (!descriptor) {
    throw new Error(`No descriptor for mascot id "${id}". Add it to MASCOT_DESCRIPTORS.`);
  }
  return `${BRAND_STYLE}, ${descriptor}.`;
}

/** All roster ids that have a descriptor (generation order is stable). */
export const ROSTER_IDS = Object.keys(MASCOT_DESCRIPTORS);
