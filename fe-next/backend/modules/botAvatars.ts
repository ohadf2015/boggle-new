/**
 * Predefined avatar configs for bot players.
 *
 * Each bot difficulty tier has 10 handcrafted avatars that match
 * the personality of bot names. These are used instead of random
 * seeded avatars so bots look like designed characters.
 *
 * Index maps 1:1 to the name arrays in botConfig.NAMES[lang][difficulty].
 * All languages share the same avatar pool per difficulty+index.
 */

import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

// ==========================================
// Easy bots — cute, approachable, silly
// ==========================================
export const EASY_BOT_AVATARS: CustomAvatarConfig[] = [
  // 0: Sleepy Panda / פנדה ישנוני / Sömnig Pansen / ねむねむパンダ
  {
    gender: 'male', base: 'round', skinColor: '#FFDBB4',
    hair: 'buzz', hairColor: '#2C1B18', eyes: 'sleepy',
    eyebrows: 'worried', mouth: 'flat', accessory: 'beanie',
    accessoryColor: '#000000', bgColor: '#8B5CF6', shirtColor: '#2C1B18',
  },
  // 1: Tiny Tornado / בועות / Lansen Lansen / ちびっこ台風
  {
    gender: 'female', base: 'round', skinColor: '#F8D5C2',
    hair: 'pigtails', hairColor: '#C62828', eyes: 'sparkle',
    eyebrows: 'raised', mouth: 'grin', accessory: 'headband',
    accessoryColor: '#FF1493', bgColor: '#00FFFF', shirtColor: '#FF6B35',
  },
  // 2: Captain Crunch / שניצלון / Kapten Kansen / もちもちくん
  {
    gender: 'male', base: 'square', skinColor: '#EDB98A',
    hair: 'combover', hairColor: '#4A3728', eyes: 'cool',
    eyebrows: 'thick', mouth: 'smirk', accessory: 'cap',
    accessoryColor: '#FF6B35', bgColor: '#FFE135', shirtColor: '#4A90D9',
  },
  // 3: Pickle Rick / גמד חמוד / Lansen Muansen / ふわふわ
  {
    gender: 'male', base: 'oval', skinColor: '#98FB98',
    hair: 'mohawk', hairColor: '#00897B', eyes: 'star',
    eyebrows: 'angry', mouth: 'grin', accessory: 'none',
    accessoryColor: '#000000', bgColor: '#BFFF00', shirtColor: '#00897B',
  },
  // 4: Sir Typo / מלפפונצ׳יק / Fnansen / おっちょこ
  {
    gender: 'male', base: 'round', skinColor: '#FFDBB4',
    hair: 'curly', hairColor: '#8B6E4E', eyes: 'dizzy',
    eyebrows: 'worried', mouth: 'oh', accessory: 'glasses',
    accessoryColor: '#000000', bgColor: '#FF1493', shirtColor: '#8B5CF6',
  },
  // 5: Bubblegum / פשטידה / Bubbelansen / バブバブ
  {
    gender: 'female', base: 'heart', skinColor: '#FFE0BD',
    hair: 'bob', hairColor: '#FF1493', eyes: 'happy',
    eyebrows: 'natural', mouth: 'bubbleGum', accessory: 'bow',
    accessoryColor: '#FF1493', bgColor: '#FF1493', shirtColor: '#E85D9B',
  },
  // 6: Noodle Brain / נודלס / Nudlansen / のんびりイモ
  {
    gender: 'male', base: 'blob', skinColor: '#D08B5B',
    hair: 'ramen', hairColor: '#FFD700', eyes: 'round',
    eyebrows: 'flat', mouth: 'tongue', accessory: 'none',
    accessoryColor: '#000000', bgColor: '#FF6B35', shirtColor: '#C62828',
  },
  // 7: Cozy Potato / תפוחון / Myspansen / サクラもち
  {
    gender: 'male', base: 'round', skinColor: '#EDB98A',
    hair: 'none', hairColor: '#4A3728', eyes: 'sleepy',
    eyebrows: 'natural', mouth: 'smile', accessory: 'scarf',
    accessoryColor: '#FF6B35', bgColor: '#FFE135', shirtColor: '#FF6B35',
  },
  // 8: Chaos Kitten / חתלתול / Kansen Kaos / いたずらネコ
  {
    gender: 'female', base: 'catFace', skinColor: '#FFE0BD',
    hair: 'bangs', hairColor: '#2C1B18', eyes: 'sparkle',
    eyebrows: 'raised', mouth: 'cat', accessory: 'catEars',
    accessoryColor: '#FF1493', bgColor: '#8B5CF6', shirtColor: '#E85D9B',
  },
  // 9: Oops Daisy / פרפר / Blansen Ansen / おひさまっこ
  {
    gender: 'female', base: 'round', skinColor: '#F8D5C2',
    hair: 'long', hairColor: '#D4A574', eyes: 'happy',
    eyebrows: 'natural', mouth: 'smile', accessory: 'flowerCrown',
    accessoryColor: '#FFD700', bgColor: '#BFFF00', shirtColor: '#00897B',
  },
];

// ==========================================
// Medium bots — sharp, confident, tactical
// ==========================================
export const MEDIUM_BOT_AVATARS: CustomAvatarConfig[] = [
  // 0: Shadow Fox / שועל ערמומי / Skugg Räven / カゲキツネ
  {
    gender: 'male', base: 'diamond', skinColor: '#AE5D29',
    hair: 'undercut', hairColor: '#2C1B18', eyes: 'cool',
    eyebrows: 'angry', mouth: 'smirk', accessory: 'sunglasses',
    accessoryColor: '#000000', bgColor: '#1a1a2e', shirtColor: '#2C1B18',
  },
  // 1: Turbo Snail / שבלול טורבו / Turbo Snansen / ターボカタツムリ
  {
    gender: 'male', base: 'round', skinColor: '#98FB98',
    hair: 'spiky', hairColor: '#00897B', eyes: 'determined',
    eyebrows: 'thick', mouth: 'grin', accessory: 'goggles',
    accessoryColor: '#00FFFF', bgColor: '#BFFF00', shirtColor: '#00897B',
  },
  // 2: The Flash / ברק / Blixt / イナズマ
  {
    gender: 'male', base: 'square', skinColor: '#FFDBB4',
    hair: 'fade', hairColor: '#FFD700', eyes: 'star',
    eyebrows: 'raised', mouth: 'grin', accessory: 'headband',
    accessoryColor: '#FFD700', bgColor: '#FFE135', shirtColor: '#C62828',
  },
  // 3: Pixel Pirate / פיראט פיקסל / Pixel Piraten / ピクセル海賊
  {
    gender: 'male', base: 'square', skinColor: '#D08B5B',
    hair: 'dreads', hairColor: '#2C1B18', eyes: 'wink',
    eyebrows: 'scarred', mouth: 'goldTooth', accessory: 'eyepatch',
    accessoryColor: '#000000', bgColor: '#1a1a2e', shirtColor: '#C62828',
  },
  // 4: Ninja Toast / נינג׳ה מנגו / Ninja Mackan / ニンジャトースト
  {
    gender: 'male', base: 'oval', skinColor: '#FFDBB4',
    hair: 'topknot', hairColor: '#2C1B18', eyes: 'squint',
    eyebrows: 'flat', mouth: 'flat', accessory: 'ninjaScarf',
    accessoryColor: '#000000', bgColor: '#1a1a2e', shirtColor: '#2C1B18',
  },
  // 5: Spicy Mango / כוכב לכת / Kryddig Mansen / スパイシーマンゴー
  {
    gender: 'female', base: 'round', skinColor: '#EDB98A',
    hair: 'wavy', hairColor: '#C62828', eyes: 'sparkle',
    eyebrows: 'arched', mouth: 'sideSmile', accessory: 'earring',
    accessoryColor: '#FFD700', bgColor: '#FF6B35', shirtColor: '#FF6B35',
  },
  // 6: Cosmic Yeti / זאב ערבות / Rymd Yansen / コズミックイエティ
  {
    gender: 'male', base: 'square', skinColor: '#808080',
    hair: 'afro', hairColor: '#FFFFFF', eyes: 'round',
    eyebrows: 'bushy', mouth: 'teeth', accessory: 'none',
    accessoryColor: '#000000', bgColor: '#8B5CF6', shirtColor: '#4A90D9',
  },
  // 7: Thunder Paws / ג׳וקר / Åsk Tansen / サンダーポウ
  {
    gender: 'male', base: 'round', skinColor: '#C68642',
    hair: 'mohawk', hairColor: '#FFD700', eyes: 'angry',
    eyebrows: 'angryThick', mouth: 'smirk', accessory: 'headphones',
    accessoryColor: '#FF6B35', bgColor: '#00FFFF', shirtColor: '#8B5CF6',
  },
  // 8: Lucky Charm / מזל טוב / Tur Klansen / ラッキーリーフ
  {
    gender: 'female', base: 'heart', skinColor: '#FFE0BD',
    hair: 'ponytail', hairColor: '#8B6E4E', eyes: 'wink',
    eyebrows: 'natural', mouth: 'smile', accessory: 'hat',
    accessoryColor: '#BFFF00', bgColor: '#BFFF00', shirtColor: '#00897B',
  },
  // 9: Warp Speed / רקטה / Ljus Fansen / ワープスピード
  {
    gender: 'male', base: 'oval', skinColor: '#FFDBB4',
    hair: 'spiky', hairColor: '#4A90D9', eyes: 'determined',
    eyebrows: 'thick', mouth: 'grin', accessory: 'goggles',
    accessoryColor: '#00FFFF', bgColor: '#00FFFF', shirtColor: '#4A90D9',
  },
];

// ==========================================
// Hard bots — intimidating, elite, legendary
// ==========================================
export const HARD_BOT_AVATARS: CustomAvatarConfig[] = [
  // 0: Big Brain Energy / מוח ענק / Stor Hjärnan / ビッグブレイン
  {
    gender: 'male', base: 'oval', skinColor: '#FFDBB4',
    hair: 'curly', hairColor: '#FFFFFF', eyes: 'sparkle',
    eyebrows: 'bushy', mouth: 'smirk', accessory: 'monocle',
    accessoryColor: '#FFD700', bgColor: '#BFFF00', shirtColor: '#00897B',
  },
  // 1: Velvet Thunder / רעם קטיפתי / Sammet Åskan / ベルベットサンダー
  {
    gender: 'male', base: 'square', skinColor: '#694D3D',
    hair: 'fade', hairColor: '#2C1B18', eyes: 'cool',
    eyebrows: 'angryThick', mouth: 'flat', accessory: 'sunglasses',
    accessoryColor: '#8B5CF6', bgColor: '#8B5CF6', shirtColor: '#2C1B18',
  },
  // 2: Lord Vocab / מלך האותיות / Ord Kungen / ことばの王
  {
    gender: 'male', base: 'shield', skinColor: '#EDB98A',
    hair: 'combover', hairColor: '#FFD700', eyes: 'round',
    eyebrows: 'raised', mouth: 'smirk', accessory: 'crown',
    accessoryColor: '#FFD700', bgColor: '#FFE135', shirtColor: '#8B5CF6',
  },
  // 3: Turbo Nerd / נרד טורבו / Turbo Nansen / ターボオタク
  {
    gender: 'male', base: 'round', skinColor: '#F8D5C2',
    hair: 'curly', hairColor: '#C62828', eyes: 'round',
    eyebrows: 'natural', mouth: 'grin', accessory: 'glasses',
    accessoryColor: '#000000', bgColor: '#00FFFF', shirtColor: '#4A90D9',
  },
  // 4: The Spelling Bee / מלכת הדבורים / Stav Bansen / スペリングビー
  {
    gender: 'female', base: 'heart', skinColor: '#FFE0BD',
    hair: 'bun', hairColor: '#FFD700', eyes: 'determined',
    eyebrows: 'arched', mouth: 'sideSmile', accessory: 'tiara',
    accessoryColor: '#FFD700', bgColor: '#FFE135', shirtColor: '#E85D9B',
  },
  // 5: Final Boss / בוס סופי / Slut Bossen / ファイナルボス
  {
    gender: 'male', base: 'skull', skinColor: '#808080',
    hair: 'mohawk', hairColor: '#C62828', eyes: 'flame',
    eyebrows: 'angry', mouth: 'vampire', accessory: 'devilHorns',
    accessoryColor: '#C62828', bgColor: '#1a1a2e', shirtColor: '#C62828',
  },
  // 6: Galaxy Brain / גלקסי / Galax Hjärnan / ギャラクシー
  {
    gender: 'female', base: 'diamond', skinColor: '#E6E6FA',
    hair: 'galaxy', hairColor: '#8B5CF6', eyes: 'galaxy',
    eyebrows: 'none', mouth: 'smile', accessory: 'astronaut',
    accessoryColor: '#FFFFFF', bgColor: '#8B5CF6', shirtColor: '#8B5CF6',
  },
  // 7: Danger Noodle / נחשון / Farlig Ormen / デンジャーヘビ
  {
    gender: 'male', base: 'oval', skinColor: '#98FB98',
    hair: 'spiky', hairColor: '#00897B', eyes: 'angry',
    eyebrows: 'angry', mouth: 'teeth', accessory: 'bandana',
    accessoryColor: '#BFFF00', bgColor: '#BFFF00', shirtColor: '#00897B',
  },
  // 8: Legend of Zelda / אגדה חיה / Legenden / レジェンド
  {
    gender: 'male', base: 'shield', skinColor: '#FFDBB4',
    hair: 'long', hairColor: '#FFD700', eyes: 'determined',
    eyebrows: 'thick', mouth: 'flat', accessory: 'samurai',
    accessoryColor: '#FFD700', bgColor: '#BFFF00', shirtColor: '#00897B',
  },
  // 9: Try Hard Terry / קשוח מרגיש / Hård Kansen / ガチ勢テリー
  {
    gender: 'male', base: 'square', skinColor: '#AE5D29',
    hair: 'flatTop', hairColor: '#2C1B18', eyes: 'angry',
    eyebrows: 'angryThick', mouth: 'teeth', accessory: 'headband',
    accessoryColor: '#C62828', bgColor: '#C62828', shirtColor: '#C62828',
  },
];

/**
 * Get a predefined avatar config by difficulty and index.
 * Falls back to null if index is out of range (caller should use seeded fallback).
 */
export function getBotAvatar(difficulty: string, index: number): CustomAvatarConfig | null {
  const pool = difficulty === 'easy' ? EASY_BOT_AVATARS
    : difficulty === 'hard' ? HARD_BOT_AVATARS
    : MEDIUM_BOT_AVATARS;

  return pool[index] ?? null;
}
