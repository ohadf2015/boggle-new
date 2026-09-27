/**
 * Untrusted label cleaning, shared by the share link (wreck.ts) and stored
 * estate towers (estateTower.ts). Kept dependency-free on purpose: estate code
 * runs in API routes and must not pull wreck.ts's matter-js into the bundle.
 */

// Controls, zero-width and bidi overrides: a shared link is untrusted input,
// and a U+202E in a name would visually reverse the rest of the HUD line.
const UNSAFE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g;

export const cleanUntrustedText = (s: string, max: number) => s.replace(UNSAFE, '').trim().slice(0, max);
