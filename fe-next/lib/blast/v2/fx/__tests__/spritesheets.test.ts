import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as PIXI from 'pixi.js';
import { loadTexture, SPRITESHEETS } from '../spritesheets';

// Mock Pixi.Assets
vi.mock('pixi.js', async () => {
  const actual = await vi.importActual<typeof PIXI>('pixi.js');
  return {
    ...actual,
    Assets: {
      load: vi.fn(),
    },
  };
});

describe('spritesheets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load a known spritesheet and return a Pixi Texture', async () => {
    const mockTexture = {} as PIXI.Texture;
    vi.mocked(PIXI.Assets.load).mockResolvedValue(mockTexture);

    const result = await loadTexture('shatter');

    expect(result).toBe(mockTexture);
    expect(PIXI.Assets.load).toHaveBeenCalledWith('/public/blast/v2/fx/shatter-8frame.png');
  });

  it('should return null and log warning for unknown spritesheet', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await loadTexture('missing' as any);

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown spritesheet: missing'));
  });

  it('should return null and log warning when loading fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = new Error('File not found');
    vi.mocked(PIXI.Assets.load).mockRejectedValue(error);

    const result = await loadTexture('shatter');

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load spritesheet shatter'),
      error
    );
  });

  it('should have all expected spritesheets in manifest', () => {
    const expectedKeys = [
      'shatter',
      'frozen_crack',
      'coin',
      'gem',
      'chest_wood',
      'chest_silver',
      'chest_gold',
      'chest_legendary',
    ];

    for (const key of expectedKeys) {
      expect(SPRITESHEETS).toHaveProperty(key);
      const sheet = SPRITESHEETS[key as keyof typeof SPRITESHEETS];
      expect(sheet.path).toBeTruthy();
      expect(sheet.frameWidth).toBeGreaterThan(0);
      expect(sheet.frameHeight).toBeGreaterThan(0);
      expect(sheet.frameCount).toBeGreaterThan(0);
      expect(typeof sheet.tintable).toBe('boolean');
    }
  });
});
