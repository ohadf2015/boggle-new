import { describe, it, expect } from 'vitest';
import { resolveMasterMuteClick } from '../masterMuteToggle';

/**
 * The master mute button (header MusicControls + in-game SurvivalAudioEffectsControls)
 * drives BOTH the music and sfx channels from a single tap.
 *
 * Two regimes:
 *
 *  1. Audio LOCKED (fresh web tab — browser autoplay policy hasn't been
 *     satisfied yet). The previous behaviour unlocked audio and toggled
 *     NOTHING, so the very first tap on the speaker was silently swallowed —
 *     the #1 reported "mute/volume doesn't work on web" symptom (native apps
 *     boot already-unlocked, so it only ever bit on web). The fix: a locked
 *     entry click moves TOWARD audible — unlock, and unmute any muted channel,
 *     but never mute. Someone tapping the speaker on a fresh page wants sound ON.
 *
 *  2. Audio UNLOCKED — the established "silence wins" master toggle:
 *     any channel audible → mute both; both muted → unmute both; drift is
 *     corrected toward silence, never flipped back to audible.
 */
describe('resolveMasterMuteClick', () => {
  describe('audio locked → move toward audible (never mute)', () => {
    it('both muted: unlock + unmute both', () => {
      expect(resolveMasterMuteClick({ audioUnlocked: false, isMuted: true, sfxMuted: true }))
        .toEqual({ unlock: true, toggleMusic: true, toggleSfx: true });
    });

    it('only music muted: unlock + unmute music (sfx already audible)', () => {
      expect(resolveMasterMuteClick({ audioUnlocked: false, isMuted: true, sfxMuted: false }))
        .toEqual({ unlock: true, toggleMusic: true, toggleSfx: false });
    });

    it('only sfx muted: unlock + unmute sfx (music already audible)', () => {
      expect(resolveMasterMuteClick({ audioUnlocked: false, isMuted: false, sfxMuted: true }))
        .toEqual({ unlock: true, toggleMusic: false, toggleSfx: true });
    });

    it('both audible: unlock only — do NOT mute on the enable click', () => {
      expect(resolveMasterMuteClick({ audioUnlocked: false, isMuted: false, sfxMuted: false }))
        .toEqual({ unlock: true, toggleMusic: false, toggleSfx: false });
    });
  });

  describe('audio unlocked → silence-wins master toggle', () => {
    it('both audible: mute both', () => {
      expect(resolveMasterMuteClick({ audioUnlocked: true, isMuted: false, sfxMuted: false }))
        .toEqual({ unlock: false, toggleMusic: true, toggleSfx: true });
    });

    it('both muted: unmute both', () => {
      expect(resolveMasterMuteClick({ audioUnlocked: true, isMuted: true, sfxMuted: true }))
        .toEqual({ unlock: false, toggleMusic: true, toggleSfx: true });
    });

    it('only music muted: mute sfx, leave music muted (silence wins)', () => {
      expect(resolveMasterMuteClick({ audioUnlocked: true, isMuted: true, sfxMuted: false }))
        .toEqual({ unlock: false, toggleMusic: false, toggleSfx: true });
    });

    it('only sfx muted: mute music, leave sfx muted (silence wins)', () => {
      expect(resolveMasterMuteClick({ audioUnlocked: true, isMuted: false, sfxMuted: true }))
        .toEqual({ unlock: false, toggleMusic: true, toggleSfx: false });
    });
  });
});
