import * as PIXI from 'pixi.js';

export type SpriteSheet = {
  path: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  tintable: boolean;
};

export const SPRITESHEETS: Record<string, SpriteSheet> = {
  shatter: {
    path: '/public/blast/v2/fx/shatter-8frame.png',
    frameWidth: 128,
    frameHeight: 128,
    frameCount: 8,
    tintable: true,
  },
  frozen_crack: {
    path: '/public/blast/v2/fx/frozen-crack-6frame.png',
    frameWidth: 96,
    frameHeight: 96,
    frameCount: 6,
    tintable: false,
  },
  coin: {
    path: '/public/blast/v2/fx/coin-overlay.png',
    frameWidth: 20,
    frameHeight: 20,
    frameCount: 1,
    tintable: false,
  },
  gem: {
    path: '/public/blast/v2/fx/gem-overlay.png',
    frameWidth: 20,
    frameHeight: 20,
    frameCount: 1,
    tintable: false,
  },
  chest_wood: {
    path: '/public/blast/v2/fx/chest-wood-closed.png',
    frameWidth: 160,
    frameHeight: 120,
    frameCount: 1,
    tintable: false,
  },
  chest_silver: {
    path: '/public/blast/v2/fx/chest-silver-closed.png',
    frameWidth: 160,
    frameHeight: 120,
    frameCount: 1,
    tintable: false,
  },
  chest_gold: {
    path: '/public/blast/v2/fx/chest-gold-closed.png',
    frameWidth: 160,
    frameHeight: 120,
    frameCount: 1,
    tintable: false,
  },
  chest_legendary: {
    path: '/public/blast/v2/fx/chest-legendary-closed.png',
    frameWidth: 160,
    frameHeight: 120,
    frameCount: 1,
    tintable: false,
  },
};

export async function loadTexture(
  name: keyof typeof SPRITESHEETS
): Promise<PIXI.Texture | null> {
  const sheet = SPRITESHEETS[name];
  if (!sheet) {
    console.warn(`Unknown spritesheet: ${name}`);
    return null;
  }
  try {
    const tex = await PIXI.Assets.load(sheet.path);
    return tex;
  } catch (e) {
    console.warn(`Failed to load spritesheet ${name} from ${sheet.path}:`, e);
    return null;
  }
}
