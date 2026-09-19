import { use, type Context } from 'react';
import { darken } from './parts/avatarDesignConstants';

/**
 * How avatar parts read the per-avatar SVG id prefix and eye colour — WITHOUT
 * importing the context modules.
 *
 * /api/avatar/png renders the parts inside a route handler (the react-server
 * layer). The contexts must stay 'use client' (createContext in a server-graph
 * module fails the build — see avatarSsrContextBoundary.test.tsx), but a 'use
 * client' module reaching that layer is a client reference: `.Provider` was
 * undefined and every PNG 404'd, so the home top bar showed an empty disc for
 * every player (2026-09-19). So the parts import this directive-free module:
 *
 * - client / SSR: AvatarUidContext + AvatarEyeColorContext register themselves
 *   when imported, and the hooks read them with `use()` (conditional-safe, and
 *   exported by the react-server build too).
 * - react-server (the PNG route): nothing registers, AvatarRendererSsr sets the
 *   values right before its synchronous renderToStaticMarkup.
 */
export const DEFAULT_EYE_COLOR = '#4A6FA5';

let uidContext: Context<string> | null = null;
let eyeColorContext: Context<string> | null = null;
let ssrUid = '';
let ssrEyeColor = DEFAULT_EYE_COLOR;

export function registerAvatarUidContext(ctx: Context<string>): void {
  uidContext = ctx;
}
export function registerAvatarEyeColorContext(ctx: Context<string>): void {
  eyeColorContext = ctx;
}

/** react-server layer only — AvatarRendererSsr, before rendering. */
export function setSsrAvatarValues(uid: string, eyeColor: string): void {
  ssrUid = uid;
  ssrEyeColor = eyeColor;
}

/** Unique avatar prefix for SVG def IDs. '' outside a provider (e.g. PartPreview). */
export function useAvatarUid(): string {
  return uidContext ? use(uidContext) : ssrUid;
}

/** Current eye/iris colour. Default blue outside a provider. */
export function useEyeColor(): string {
  return eyeColorContext ? use(eyeColorContext) : ssrEyeColor;
}

/** A darker shade of the eye colour for depth. */
export function useEyeColorDark(): string {
  return darken(useEyeColor(), 0.25);
}
