/**
 * Celebrity & politician lookalike bots.
 *
 * Funny, viral AI opponents whose avatars caricature real public figures using the
 * parametric avatar CONFIG (hair/face/skin/accessory), never a photo or likeness image —
 * so it's cartoon parody, not a portrait. Names are language-agnostic proper nouns
 * (a Japanese player facing "Trump Bot" is part of the joke).
 *
 * To add one: pick recognisable visual hooks (Trump's blonde comb-over, Einstein's white
 * frizz + mustache, Jobs' black turtleneck) and map them onto the avatar enums in
 * shared/types/customAvatar.ts. The .test.ts validates every avatar against the Zod schema.
 */
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface CelebrityBot {
  name: string;
  emoji: string;
  color: string;
  customAvatar: CustomAvatarConfig;
}

/** Chance (0..1) that a newly added bot is a celebrity lookalike instead of a generic name. */
export const CELEBRITY_CHANCE = 0.35;

export const CELEBRITY_BOTS: CelebrityBot[] = [
  {
    name: 'Trump', emoji: '🇺🇸', color: '#FF6B35',
    customAvatar: {
      gender: 'male', base: 'round', skinColor: '#E3A164',
      hair: 'trumpSwoop', hairColor: '#E8C07A',
      eyes: 'squint', eyeColor: '#3B82F6', noseStyle: 'wide', eyebrows: 'thin',
      facialHair: 'none', mouth: 'smirk',
      accessory: 'none', accessoryColor: '#FFD700',
      bgColor: '#C62828', shirtColor: '#C62828', bodyStyle: 'suit',
    },
  },
  {
    name: 'Bibi', emoji: '🇮🇱', color: '#4A90D9',
    customAvatar: {
      gender: 'male', base: 'square', skinColor: '#EDB98A',
      hair: 'recedingHair', hairColor: '#C0C0C0',
      eyes: 'cool', eyeColor: '#6B4423', noseStyle: 'roman', eyebrows: 'thick',
      facialHair: 'none', mouth: 'flat',
      accessory: 'none', accessoryColor: '#000000',
      bgColor: '#1a1a2e', shirtColor: '#2C1B18', bodyStyle: 'suit',
    },
  },
  {
    name: 'Obama', emoji: '🦅', color: '#3B82F6',
    customAvatar: {
      gender: 'male', base: 'oval', skinColor: '#8D5524',
      hair: 'buzz', hairColor: '#2C1B18',
      eyes: 'happy', eyeColor: '#6B4423', noseStyle: 'round', eyebrows: 'natural',
      facialHair: 'none', mouth: 'grin',
      accessory: 'none', accessoryColor: '#FFFFFF',
      bgColor: '#1a1a2e', shirtColor: '#4A90D9', bodyStyle: 'suit',
    },
  },
  {
    name: 'Putin', emoji: '🐻', color: '#808080',
    customAvatar: {
      gender: 'male', base: 'square', skinColor: '#FFDBB4',
      hair: 'recedingHair', hairColor: '#C0C0C0',
      eyes: 'squint', eyeColor: '#6B7280', noseStyle: 'round', eyebrows: 'flat',
      facialHair: 'none', mouth: 'flat',
      accessory: 'none', accessoryColor: '#000000',
      bgColor: '#1a1a2e', shirtColor: '#2C1B18', bodyStyle: 'suit',
    },
  },
  {
    name: 'Kim', emoji: '🇰🇵', color: '#C62828',
    customAvatar: {
      gender: 'male', base: 'round', skinColor: '#FFE0BD',
      hair: 'highAndTight', hairColor: '#2C1B18',
      eyes: 'squint', eyeColor: '#6B4423', noseStyle: 'round', eyebrows: 'thick',
      facialHair: 'none', mouth: 'flat',
      accessory: 'none', accessoryColor: '#000000',
      bgColor: '#C62828', shirtColor: '#2C1B18', bodyStyle: 'suit',
    },
  },
  {
    name: 'Greta', emoji: '🌍', color: '#BFFF00',
    customAvatar: {
      gender: 'female', base: 'round', skinColor: '#FFE0BD',
      hair: 'braids', hairColor: '#4A3728',
      eyes: 'angry', eyeColor: '#6B4423', noseStyle: 'button', eyebrows: 'natural',
      mouth: 'flat',
      accessory: 'none', accessoryColor: '#000000',
      bgColor: '#00897B', shirtColor: '#F57F17', bodyStyle: 'hoodie',
    },
  },
  {
    name: 'Elon', emoji: '🚀', color: '#00FFFF',
    customAvatar: {
      gender: 'male', base: 'oval', skinColor: '#F8D5C2',
      hair: 'recedingHair', hairColor: '#4A3728',
      eyes: 'focused', eyeColor: '#6B4423', noseStyle: 'round', eyebrows: 'natural',
      facialHair: 'stubble', mouth: 'smirk',
      accessory: 'none', accessoryColor: '#000000',
      bgColor: '#1a1a2e', shirtColor: '#2C1B18', bodyStyle: 'suit',
    },
  },
  {
    name: 'Jobs', emoji: '🍎', color: '#C0C0C0',
    customAvatar: {
      gender: 'male', base: 'oval', skinColor: '#F8D5C2',
      hair: 'buzz', hairColor: '#808080',
      eyes: 'focused', eyeColor: '#6B7280', noseStyle: 'round', eyebrows: 'natural',
      facialHair: 'shortBeard', mouth: 'closedSmile',
      accessory: 'glasses', accessoryColor: '#000000',
      bgColor: '#1a1a2e', shirtColor: '#2C1B18', bodyStyle: 'turtleneck',
    },
  },
  {
    name: 'Einstein', emoji: '🧠', color: '#C0C0C0',
    customAvatar: {
      gender: 'male', base: 'oval', skinColor: '#FFE0BD',
      hair: 'frizzle', hairColor: '#FFFFFF',
      eyes: 'curious', eyeColor: '#6B7280', noseStyle: 'wide', eyebrows: 'bushy',
      facialHair: 'mustache', mouth: 'flat',
      accessory: 'none', accessoryColor: '#000000',
      bgColor: '#1a1a2e', shirtColor: '#6B7280', bodyStyle: 'default',
    },
  },
  {
    name: 'Brad', emoji: '😎', color: '#FFD700',
    customAvatar: {
      gender: 'male', base: 'oval', skinColor: '#F8D5C2',
      hair: 'sideSwept', hairColor: '#D4A574',
      eyes: 'cool', eyeColor: '#3B82F6', noseStyle: 'pointed', eyebrows: 'natural',
      facialHair: 'stubble', mouth: 'smirk',
      accessory: 'sunglasses', accessoryColor: '#000000',
      bgColor: '#1a1a2e', shirtColor: '#2C1B18', bodyStyle: 'default',
    },
  },
  {
    name: 'Keanu', emoji: '🕶️', color: '#2C1B18',
    customAvatar: {
      gender: 'male', base: 'oval', skinColor: '#EDB98A',
      hair: 'long', hairColor: '#2C1B18',
      eyes: 'relaxed', eyeColor: '#6B4423', noseStyle: 'pointed', eyebrows: 'natural',
      facialHair: 'shortBeard', mouth: 'flat',
      accessory: 'sunglasses', accessoryColor: '#000000',
      bgColor: '#1a1a2e', shirtColor: '#2C1B18', bodyStyle: 'default',
    },
  },
  {
    name: 'Rock', emoji: '💪', color: '#8B6E4E',
    customAvatar: {
      gender: 'male', base: 'square', skinColor: '#C68642',
      hair: 'none', hairColor: '#2C1B18',
      eyes: 'confident', eyeColor: '#6B4423', noseStyle: 'wide', eyebrows: 'thick',
      facialHair: 'none', mouth: 'grin',
      accessory: 'sunglasses', accessoryColor: '#000000',
      bgColor: '#2C1B18', shirtColor: '#2C1B18', bodyStyle: 'default',
    },
  },
  {
    name: 'Ramsay', emoji: '🔥', color: '#FF3366',
    customAvatar: {
      gender: 'male', base: 'square', skinColor: '#F8D5C2',
      hair: 'shag', hairColor: '#C0C0C0',
      eyes: 'angry', eyeColor: '#3B82F6', noseStyle: 'pointed', eyebrows: 'angry',
      facialHair: 'stubble', mouth: 'flat',
      accessory: 'chefHat', accessoryColor: '#FFFFFF',
      bgColor: '#C62828', shirtColor: '#FFFFFF', bodyStyle: 'default',
    },
  },
  {
    name: 'Taylor', emoji: '🎤', color: '#FF1493',
    customAvatar: {
      gender: 'female', base: 'oval', skinColor: '#FFE0BD',
      hair: 'curtainBangs', hairColor: '#E8C07A',
      eyes: 'wingedLiner', eyeColor: '#3B82F6', noseStyle: 'button', eyebrows: 'arched',
      mouth: 'lipstick',
      accessory: 'none', accessoryColor: '#FF1493',
      bgColor: '#FF1493', shirtColor: '#E85D9B', bodyStyle: 'default',
    },
  },
  {
    name: 'Beyoncé', emoji: '👑', color: '#FFD700',
    customAvatar: {
      gender: 'female', base: 'oval', skinColor: '#C68642',
      hair: 'wavy', hairColor: '#D4A574',
      eyes: 'wingedLiner', eyeColor: '#92400E', noseStyle: 'button', eyebrows: 'arched',
      mouth: 'lipGloss',
      accessory: 'none', accessoryColor: '#FFD700',
      bgColor: '#FFD700', shirtColor: '#FFD700', bodyStyle: 'offShoulder',
    },
  },
  {
    name: 'Oprah', emoji: '📣', color: '#8B5CF6',
    customAvatar: {
      gender: 'female', base: 'round', skinColor: '#8D5524',
      hair: 'afro', hairColor: '#2C1B18',
      eyes: 'happy', eyeColor: '#6B4423', noseStyle: 'round', eyebrows: 'arched',
      mouth: 'grin',
      accessory: 'earring', accessoryColor: '#FFD700',
      bgColor: '#8B5CF6', shirtColor: '#8B5CF6', bodyStyle: 'default',
    },
  },
  {
    name: 'Snoop', emoji: '🌿', color: '#BFFF00',
    customAvatar: {
      gender: 'male', base: 'oval', skinColor: '#8D5524',
      hair: 'braids', hairColor: '#2C1B18',
      eyes: 'relaxed', eyeColor: '#6B4423', noseStyle: 'wide', eyebrows: 'natural',
      facialHair: 'goatee', mouth: 'smirk',
      accessory: 'sunglasses', accessoryColor: '#000000',
      bgColor: '#8B5CF6', shirtColor: '#8B5CF6', bodyStyle: 'default',
    },
  },
  {
    name: 'Messi', emoji: '⚽', color: '#87CEEB',
    customAvatar: {
      gender: 'male', base: 'round', skinColor: '#EDB98A',
      hair: 'fade', hairColor: '#2C1B18',
      eyes: 'determined', eyeColor: '#6B4423', noseStyle: 'button', eyebrows: 'natural',
      facialHair: 'shortBeard', mouth: 'closedSmile',
      accessory: 'none', accessoryColor: '#87CEEB',
      bgColor: '#4A90D9', shirtColor: '#87CEEB', bodyStyle: 'default',
    },
  },
  {
    name: 'Ronaldo', emoji: '🐐', color: '#FFD700',
    customAvatar: {
      gender: 'male', base: 'square', skinColor: '#D08B5B',
      hair: 'quiff', hairColor: '#2C1B18',
      eyes: 'confident', eyeColor: '#6B4423', noseStyle: 'pointed', eyebrows: 'thick',
      facialHair: 'stubble', mouth: 'grin',
      accessory: 'none', accessoryColor: '#FFD700',
      bgColor: '#C62828', shirtColor: '#C62828', bodyStyle: 'default',
    },
  },
];
