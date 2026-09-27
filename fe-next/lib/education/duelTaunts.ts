/**
 * Duel taunt stickers.
 *
 * Four mascot stickers, ids only — the id is what travels over the socket
 * (`duel:taunt`), so nothing free-typed ever reaches a classmate's screen.
 * The server keeps its own copy of this allowlist in
 * backend/handlers/duel/taunt.ts; this list is the render side of it.
 */

export type DuelTauntId = 'fire' | 'mindblown' | 'trophy' | 'tears';

export interface DuelTaunt {
  id: DuelTauntId;
  /** Transparent sticker art (192px square). */
  src: string;
  /** i18n key for the caption under the sticker. */
  labelKey: string;
  /** Ring colour on the picker tile. */
  accentClass: string;
}

export const DUEL_TAUNTS: readonly DuelTaunt[] = [
  {
    id: 'fire',
    src: '/mascot/teacher/sticker-fire.webp',
    labelKey: 'education.duels.tauntFire',
    accentClass: 'bg-neo-orange',
  },
  {
    id: 'mindblown',
    src: '/mascot/teacher/sticker-mindblown.webp',
    labelKey: 'education.duels.tauntMindblown',
    accentClass: 'bg-neo-cyan',
  },
  {
    id: 'trophy',
    src: '/mascot/teacher/sticker-trophy.webp',
    labelKey: 'education.duels.tauntTrophy',
    accentClass: 'bg-neo-lime',
  },
  {
    id: 'tears',
    src: '/mascot/teacher/sticker-tears.webp',
    labelKey: 'education.duels.tauntTears',
    accentClass: 'bg-neo-pink',
  },
] as const;

export function duelTauntById(id: string): DuelTaunt | undefined {
  return DUEL_TAUNTS.find((taunt) => taunt.id === id);
}

function storageKey(duelId: string): string {
  return `lexiclash:duel-taunt:${duelId}`;
}

/**
 * Remember the sticker this device sent for a duel so the turn card still shows
 * it after a reload. Unknown ids are dropped rather than persisted.
 */
export function rememberSentTaunt(duelId: string, tauntId: string): void {
  if (typeof window === 'undefined') return;
  if (!duelTauntById(tauntId)) return;
  try {
    window.localStorage.setItem(storageKey(duelId), tauntId);
  } catch {
    // blocked storage — the sticker still went out over the socket
  }
}

export function readSentTaunt(duelId: string): DuelTauntId | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(duelId));
    if (!raw) return null;
    return duelTauntById(raw)?.id ?? null;
  } catch {
    return null;
  }
}
