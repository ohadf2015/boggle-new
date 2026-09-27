/**
 * The two cues the end of a classroom round is allowed to make.
 *
 * Deliberately NOT routed through `SoundEffectsContext`'s Howler registry: that
 * registry is a shared file half a dozen surfaces edit, and a results screen
 * that needs one short win sting does not need a global sound key. This is the
 * same one-shot `new Audio()` shape `TvResultsView` already uses — with the
 * same mute contract, which is the part that actually matters.
 *
 * Silence wins every tie. Muted SFX, audio not yet unlocked by a gesture, a
 * hidden tab, or a browser that refuses the play() promise all end in nothing
 * happening and nothing thrown. A classroom is a room with thirty people in
 * it; a sound that fires when the teacher muted the laptop is worse than no
 * sound at all.
 */

/** The winner reveal: a short fanfare, trimmed so it lands inside the beat. */
export const ROUND_WIN_SOUND = '/sounds/education-round-win.mp3';
/** The class sweep: a brighter, shorter chime, never played with the fanfare. */
export const CLASS_SWEEP_SOUND = '/sounds/education-class-sweep.mp3';

export interface RoundEndSoundGate {
  /** `audioUnlocked` from MusicContext — false before the first gesture. */
  unlocked: boolean;
  /** `sfxMuted` from SoundEffectsContext. */
  muted: boolean;
  /** `sfxVolume` from SoundEffectsContext, 0..1. */
  volume: number;
}

/**
 * Plays one cue, once. Returns the element so a caller can stop it on unmount
 * — a rematch must not leave the previous round's fanfare running over the new
 * lobby (Pitfall Class 2: state that outlives the round that made it).
 */
export function playRoundEndCue(
  src: string,
  gate: RoundEndSoundGate
): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof window.Audio !== 'function') return null;
  if (!gate.unlocked || gate.muted) return null;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return null;

  try {
    const audio = new window.Audio(src);
    // 0.7 keeps the sting under the room's own noise instead of over it.
    audio.volume = Math.max(0, Math.min(1, gate.volume * 0.7));
    void audio.play?.().catch(() => {
      // Autoplay refused — the celebration is visual anyway.
    });
    return audio;
  } catch {
    return null;
  }
}

export default playRoundEndCue;
