/**
 * Pure decision logic for the app's master mute button — shared by the global
 * header (`MusicControls`) and the in-game daily-challenge control
 * (`SurvivalAudioEffectsControls`). Both drive the music AND sfx channels from
 * a single tap, and both previously duplicated this branching inline.
 *
 * Keeping it pure makes the two regimes (locked / unlocked) unit-testable
 * without rendering, and guarantees the two call sites stay in lockstep.
 */

export interface MasterMuteState {
  /** Browser autoplay gesture satisfied? Fresh web tabs start false. */
  audioUnlocked: boolean;
  isMuted: boolean;
  sfxMuted: boolean;
}

export interface MasterMuteAction {
  /** Call `unlockAudio()` when true. */
  unlock: boolean;
  /** Call `toggleMute()` (music) when true. */
  toggleMusic: boolean;
  /** Call `toggleSfxMute()` when true. */
  toggleSfx: boolean;
}

/**
 * Decide what a master-mute-button click should do.
 *
 * - Audio LOCKED: move TOWARD audible. Unlock, and unmute any muted channel —
 *   never mute. A tap on the speaker on a fresh page means "I want sound",
 *   so the enable click must not silence audio (and must not be swallowed,
 *   which was the web-only "mute doesn't work" bug — native boots unlocked).
 * - Audio UNLOCKED: silence-wins master toggle. Any channel audible → mute
 *   both; both muted → unmute both. Drift is corrected toward silence.
 */
export function resolveMasterMuteClick({ audioUnlocked, isMuted, sfxMuted }: MasterMuteState): MasterMuteAction {
  if (!audioUnlocked) {
    // Toward audible: unmute whatever is muted, mute nothing.
    return { unlock: true, toggleMusic: isMuted, toggleSfx: sfxMuted };
  }

  const anyAudible = !isMuted || !sfxMuted;
  if (anyAudible) {
    // Silence wins: mute the audible channels, never flip a muted one back on.
    return { unlock: false, toggleMusic: !isMuted, toggleSfx: !sfxMuted };
  }
  // Both muted → unmute both.
  return { unlock: false, toggleMusic: true, toggleSfx: true };
}
