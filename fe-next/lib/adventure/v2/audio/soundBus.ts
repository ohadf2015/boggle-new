import { Howl } from 'howler';

type SfxKey =
  | 'tile_tap'
  | 'tile_undo'
  | 'word_submit'
  | 'word_invalid'
  | 'hit_enemy'
  | 'hit_hero'
  | 'victory'
  | 'defeat';

const SFX_PATHS: Record<SfxKey, string> = {
  tile_tap: '/audio/adventure-v2/tile-tap.mp3',
  tile_undo: '/audio/adventure-v2/tile-undo.mp3',
  word_submit: '/audio/adventure-v2/word-submit.mp3',
  word_invalid: '/audio/adventure-v2/word-invalid.mp3',
  hit_enemy: '/audio/adventure-v2/hit-enemy.mp3',
  hit_hero: '/audio/adventure-v2/hit-hero.mp3',
  victory: '/audio/adventure-v2/victory.mp3',
  defeat: '/audio/adventure-v2/defeat.mp3',
};

const sfxCache: Partial<Record<SfxKey, Howl>> = {};

export function playSfx(key: SfxKey) {
  if (typeof window === 'undefined') return;
  let h = sfxCache[key];
  if (!h) {
    h = new Howl({ src: [SFX_PATHS[key]], volume: 0.7, preload: true });
    sfxCache[key] = h;
  }
  h.play();
}

if (typeof window !== 'undefined') {
  window.addEventListener('blur', () => {
    Object.values(sfxCache).forEach((h) => h?.mute(true));
  });
  window.addEventListener('focus', () => {
    Object.values(sfxCache).forEach((h) => h?.mute(false));
  });
}
