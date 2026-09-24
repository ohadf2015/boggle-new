/**
 * The art track's reference characters: rows by rarity, mixed genders and
 * skin tones. If a redraw makes any of these look worse, it is a regression.
 */
import type { VisualTier } from '@/lib/avatar/rarity';
import { DEFAULT_AVATAR_CONFIG, type CustomAvatarConfig } from '@/shared/types/customAvatar';

type C = Partial<CustomAvatarConfig>;
const f = (c: C): CustomAvatarConfig => ({ ...DEFAULT_AVATAR_CONFIG, eyebrows: 'natural', ...c }) as CustomAvatarConfig;

export const SHOWCASE: Record<VisualTier, CustomAvatarConfig[]> = {
  common: [
    f({ gender: 'female', skinColor: '#8D5524', hair: 'pigtails', hairColor: '#2C1B18', eyes: 'happy', mouth: 'grin', eyebrows: 'thick', bgColor: '#FFE135', shirtColor: '#2C1B18' }),
    f({ skinColor: '#FFDBB4', hair: 'spiky', hairColor: '#E8C07A', eyes: 'sparkle', mouth: 'tongue', bgColor: '#00FFFF', shirtColor: '#FF6B35' }),
    f({ gender: 'female', skinColor: '#F8D5C2', hair: 'long', hairColor: '#C62828', eyes: 'round', mouth: 'smile', accessory: 'glasses', accessoryColor: '#8B5CF6', bgColor: '#BFFF00', bodyStyle: 'turtleneck', shirtColor: '#2C1B18' }),
    f({ skinColor: '#694D3D', hair: 'afro', hairColor: '#2C1B18', eyes: 'wink', mouth: 'teeth', accessory: 'cap', accessoryColor: '#BFFF00', bgColor: '#8B5CF6', facialHair: 'none' }),
    f({ gender: 'female', skinColor: '#4A2912', hair: 'braids', hairColor: '#2C1B18', eyes: 'curious', mouth: 'bubbleGum', bgColor: '#FF1493', bodyStyle: 'offShoulder', shirtColor: '#FFD700' }),
    f({ skinColor: '#C68642', hair: 'sideSwept', hairColor: '#4A3728', eyes: 'determined', mouth: 'smirk', facialHair: 'shortBeard', bgColor: '#FF6B35', bodyStyle: 'hoodie', shirtColor: '#00897B' }),
  ],
  rare: [
    f({ gender: 'female', skinColor: '#F8D5C2', hair: 'cottonCandy', eyes: 'kawaii', mouth: 'smile', bgColor: '#8B5CF6', shirtColor: '#FFFFFF' }),
    f({ skinColor: '#AE5D29', hair: 'elvis', hairColor: '#2C1B18', eyes: 'confident', mouth: 'goldTooth', accessory: 'headphones', accessoryColor: '#FF1493', bgColor: '#BFFF00', bodyStyle: 'suit', shirtColor: '#2C1B18' }),
    f({ gender: 'female', skinColor: '#D08B5B', hair: 'twintails', hairColor: '#6A1B9A', eyes: 'animeEye', eyeColor: '#A855F7', mouth: 'smile', bgColor: '#FFE135', shirtColor: '#FF1493' }),
    f({ skinColor: '#FFDBB4', hair: 'undercut', hairColor: '#808080', eyes: 'round', accessory: 'cowboyHat', mouth: 'smirk', facialHair: 'handlebar', bgColor: '#FF6B35' }),
    f({ gender: 'female', skinColor: '#8D5524', hair: 'vaporwave', eyes: 'lashes', accessory: 'tiara', mouth: 'kiss', bgColor: '#00FFFF', bodyStyle: 'cropTop', shirtColor: '#8B5CF6' }),
    f({ skinColor: '#EDB98A', base: 'slime', hair: 'none', eyes: 'cyclops', mouth: 'fangs', bgColor: '#FF1493' }),
  ],
  epic: [
    f({ skinColor: '#C68642', hair: 'lightning', eyes: 'starEye', mouth: 'neonSmile', bgColor: '#4A90D9', bodyStyle: 'hoodie', shirtColor: '#2C1B18' }),
    f({ gender: 'female', skinColor: '#FFE0BD', hair: 'galaxy', eyes: 'galaxy', mouth: 'smile', accessory: 'butterflyWings', bgColor: '#8B5CF6', shirtColor: '#1a1a2e' }),
    f({ skinColor: '#694D3D', hair: 'flame', eyes: 'flame', mouth: 'grin', facialHair: 'flameBeard', bgColor: '#FF6B35' }),
    f({ gender: 'female', skinColor: '#F8D5C2', hair: 'long', hairColor: '#FFFFFF', eyes: 'heartEye', mouth: 'smile', accessory: 'angelWings', bgColor: '#FF1493', shirtColor: '#FFFFFF' }),
    f({ skinColor: '#FFDBB4', base: 'robotHead', hair: 'none', eyes: 'robot', mouth: 'robotMouth', bgColor: '#00FFFF', bodyStyle: 'suit', shirtColor: '#4A90D9' }),
    f({ gender: 'female', skinColor: '#AE5D29', hair: 'bob', hairColor: '#2C1B18', eyes: 'kawaii', mouth: 'openLaugh', accessory: 'frogHat', bgColor: '#BFFF00', shirtColor: '#FF6B35' }),
  ],
  legendary: [
    f({ gender: 'female', skinColor: '#8D5524', hair: 'longFlow', hairColor: '#2C1B18', eyes: 'infinity', mouth: 'smile', accessory: 'crystalCrown', bgColor: '#8B5CF6', shirtColor: '#FFD700' }),
    f({ base: 'dragonHead', hair: 'none', eyes: 'flame', mouth: 'dragon', accessory: 'none', bgColor: '#4A90D9', shirtColor: '#C62828' }),
    f({ skinColor: '#EDB98A', hair: 'spiky', hairColor: '#C62828', eyes: 'sparkle', mouth: 'grin', accessory: 'phoenixCrown', bgColor: '#FF6B35', bodyStyle: 'suit', shirtColor: '#1a1a2e' }),
    f({ skinColor: '#FFDBB4', hair: 'recedingHair', hairColor: '#EDEDED', eyes: 'thirdEye', eyeColor: '#7C3AED', mouth: 'smile', facialHair: 'wizardBeard', bgColor: '#00FFFF', shirtColor: '#8B5CF6' }),
    f({ skinColor: '#D08B5B', hair: 'trumpSwoop', hairColor: '#E8C07A', eyes: 'cool', mouth: 'smirk', accessory: 'sunglasses', bgColor: '#FF1493', bodyStyle: 'suit', shirtColor: '#2C1B18' }),
    f({ gender: 'female', skinColor: '#4A2912', hair: 'spaceBuns', hairColor: '#2C1B18', eyes: 'happy', mouth: 'openLaugh', accessory: 'microphone', bgColor: '#BFFF00', shirtColor: '#FF1493' }),
  ],
};
