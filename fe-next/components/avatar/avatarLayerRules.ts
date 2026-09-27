/**
 * Layer / skip facts about the avatar art, DERIVED from the part definitions
 * in components/avatar/art (each part declares its own layer), so there is no
 * second list to keep in sync. Client and PNG render the same compositor, so
 * the old client-vs-SSR drift this file guarded against can no longer happen.
 */
import { HEADS } from './art/heads';
import { ACCESSORIES, EYES, HAIR } from './art/registry';

const keysWhere = <T,>(rec: Record<string, T>, pred: (v: T) => boolean) =>
  new Set(Object.entries(rec).filter(([, v]) => pred(v)).map(([k]) => k));

/** Hair styles with volume drawn behind the head. */
export const BACK_LAYER_STYLES = keysWhere(HAIR, h => Boolean(h.back));

/** Accessories drawn behind the whole character (wings…). */
export const BACK_ACCESSORY_STYLES = keysWhere(ACCESSORIES, a => a.layer === 'back');

/** Bases whose material rejects cheek blush (costume heads). */
export const SKIP_BLUSH_BASES = keysWhere(HEADS, h => Boolean(h.noBlush));

/** Bases that draw their own nose anatomy. */
export const SKIP_NOSE_BASES = keysWhere(HEADS, h => Boolean(h.ownNose));

/** Eyes that must not blink (closed, glowing, symbolic). */
export const SKIP_BLINK_EYES = keysWhere(EYES, e => !e.blink);
