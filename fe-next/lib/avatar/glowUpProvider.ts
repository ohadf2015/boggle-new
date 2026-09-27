/**
 * Glow-Up provider boundary — the single seam where AI portrait generation plugs in.
 *
 * Per-user RUNTIME generation requires a SERVER-SIDE Higgsfield credential
 * (the `higgsfield` CLI used at author-time is authed to a personal account and
 * is NOT a production server credential). Until that key + moderation pass are
 * provisioned, the provider is a clearly-failing stub. Swapping in the real
 * implementation is local to this file.
 *
 * See docs/superpowers/specs/2026-06-20-higgsfield-avatar-system-design.md (Track B).
 */

/**
 * Locked prompt DNA for per-user glow-up portraits: a premium 2D CARICATURE.
 * Identity (hair, colors, glasses/accessories) is carried by the reference image
 * (`--image`); the prompt elevates the flat avatar into an exaggerated, polished
 * party-game caricature. Chosen 2026-06-20 ("2d direction, more caricature").
 */
export const GLOW_UP_PROMPT = [
  'Premium 2D caricature character portrait based on the reference avatar',
  'match the reference EXACTLY: same hairstyle, colors, and only the accessories present in it',
  'do NOT add glasses, hats, or any accessory that is not in the reference image',
  'exaggerated CUTE cartoon caricature with an oversized expressive head and small body',
  'big warm grin, large sparkly expressive eyes, adorable kawaii charm, soft rounded shapes, lots of personality',
  'confident bold black lineart of varying weight',
  'glossy cel shading with soft gradients and bright highlights',
  'vibrant electric palette, clean flat background',
  'polished party-game hero sticker art, high contrast',
].join(', ');

export interface GlowUpRequest {
  /** PNG of the user's rasterized live avatar (identity anchor). */
  referencePng: Blob | ArrayBuffer | Uint8Array;
  /** Optional Soul-ID for stronger identity lock. */
  soulId?: string;
  prompt?: string;
}

export interface GlowUpResult {
  /** Hosted URL of the generated portrait (to be downloaded + stored in Supabase). */
  url: string;
}

export interface GlowUpProvider {
  generate(req: GlowUpRequest): Promise<GlowUpResult>;
}

/** Error thrown until a server-side Higgsfield credential is provisioned. */
export class GlowUpNotProvisionedError extends Error {
  constructor() {
    super(
      'Avatar Glow-Up is not provisioned: a server-side Higgsfield credential and ' +
        'a content-moderation pass are required before runtime generation can be enabled.',
    );
    this.name = 'GlowUpNotProvisionedError';
  }
}

/** Inert stub — keeps the feature dark and fails loudly if accidentally invoked. */
export const notProvisionedProvider: GlowUpProvider = {
  async generate(): Promise<GlowUpResult> {
    throw new GlowUpNotProvisionedError();
  },
};

/**
 * Resolve the active provider. Returns the inert stub until the real
 * server-backed provider is wired here (gated by env + feature flag).
 */
export function getGlowUpProvider(): GlowUpProvider {
  return notProvisionedProvider;
}
