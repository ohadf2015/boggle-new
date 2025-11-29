// Sound effect constants and definitions
// Mapped to audio files in /assets/audio/

export const SOUND_FILES = {
  // Background Music Tracks
  MUSIC: {
    LOBBY: require('../../../assets/audio/in_lobby.mp3'),
    BEFORE_GAME: require('../../../assets/audio/before_game.mp3'),
    IN_GAME: require('../../../assets/audio/in_game.mp3'),
    ALMOST_OUT_OF_TIME: require('../../../assets/audio/almost_out_of_time.mp3'),
  },

  // Sound Effects
  SFX: {
    WORD_ACCEPTED: require('../../../assets/audio/word_accepted.mp3'),
    WORD_REJECTED: require('../../../assets/audio/word_rejected.mp3'),
    COMBO: require('../../../assets/audio/combo.mp3'),
    ACHIEVEMENT: require('../../../assets/audio/achievement.mp3'),
    GAME_START: require('../../../assets/audio/game_start.mp3'),
    GAME_END: require('../../../assets/audio/game_end.mp3'),
    TIMER_WARNING: require('../../../assets/audio/timer_warning.mp3'),
  },
} as const;

// Track keys for easy reference
export const TRACK_KEYS = {
  LOBBY: 'lobby' as const,
  BEFORE_GAME: 'beforeGame' as const,
  IN_GAME: 'inGame' as const,
  ALMOST_OUT_OF_TIME: 'almostOutOfTime' as const,
};

// SFX keys for easy reference
export const SFX_KEYS = {
  WORD_ACCEPTED: 'wordAccepted' as const,
  WORD_REJECTED: 'wordRejected' as const,
  COMBO: 'combo' as const,
  ACHIEVEMENT: 'achievement' as const,
  GAME_START: 'gameStart' as const,
  GAME_END: 'gameEnd' as const,
  TIMER_WARNING: 'timerWarning' as const,
};

// Type definitions
export type TrackKey = keyof typeof SOUND_FILES.MUSIC;
export type SfxKey = keyof typeof SOUND_FILES.SFX;

// Default volume settings
export const DEFAULT_VOLUMES = {
  music: 0.5,
  sfx: 0.7,
};

// Fade durations (in milliseconds)
export const FADE_DURATION = {
  SHORT: 500,
  NORMAL: 1000,
  LONG: 2000,
};
