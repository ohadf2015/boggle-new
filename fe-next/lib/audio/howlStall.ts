import type { Howl } from 'howler';

type HowlSound = { _paused?: boolean; _ended?: boolean; _node?: { paused?: boolean } };

/**
 * Howler never listens for the media element's `pause` event, so when Android
 * takes audio focus (an AdMob ad, a call) the element stops while `playing()`
 * keeps returning true and every resume path skips the track.
 */
export function isHowlStalled(howl: Howl | null | undefined): boolean {
  if (!howl || !howl.playing()) return false;
  const sounds = (howl as unknown as { _sounds?: HowlSound[] })._sounds ?? [];
  return sounds.some((s) => !s._paused && !s._ended && s._node?.paused === true);
}

export function restartStalledHowl(howl: Howl | null | undefined): boolean {
  if (!howl || !isHowlStalled(howl)) return false;
  howl.pause();
  howl.play();
  return true;
}
