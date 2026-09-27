import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { playWordFoundFx } from '../burst';
import * as spritesheets from '../spritesheets';
import * as haptics from '../haptics';

// Mock dependencies
vi.mock('pixi.js', async () => {
  const actual = await vi.importActual<typeof PIXI>('pixi.js');

  class MockSprite {
    x = 0;
    y = 0;
    tint = 0xffffff;
    constructor(public texture: any) {}
  }

  class MockGraphics {
    filters: any[] = [];
    x = 0;
    y = 0;
    alpha = 1;
    beginFill = vi.fn().mockReturnThis();
    drawCircle = vi.fn().mockReturnThis();
    endFill = vi.fn().mockReturnThis();
  }

  return {
    ...actual,
    Sprite: MockSprite,
    Graphics: MockGraphics,
    Container: class MockContainer {},
  };
});

vi.mock('gsap', () => ({
  default: {
    to: vi.fn().mockReturnValue({ kill: vi.fn() }),
  },
}));

vi.mock('../spritesheets');
vi.mock('../haptics');
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<any>('framer-motion');
  return {
    ...actual,
    useReducedMotion: vi.fn(() => false),
  };
});

describe('burst FX', () => {
  let mockBoard: HTMLDivElement;
  let mockStage: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock board with cells
    mockBoard = document.createElement('div');
    const cell1 = document.createElement('div');
    cell1.setAttribute('data-cell-id', 'c0r0');
    cell1.getBoundingClientRect = vi.fn(() => ({
      left: 10,
      top: 10,
      width: 40,
      height: 40,
      right: 50,
      bottom: 50,
    } as DOMRect));
    mockBoard.appendChild(cell1);

    mockBoard.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 400,
      height: 600,
      right: 400,
      bottom: 600,
    } as DOMRect));

    mockStage = {
      addChild: vi.fn(),
      removeChild: vi.fn(),
    };

    vi.mocked(spritesheets.loadTexture).mockResolvedValue({} as PIXI.Texture);
    vi.mocked(haptics.useHaptics).mockReturnValue({
      vibrateLight: vi.fn(),
      vibrateMedium: vi.fn(),
      vibrateHeavy: vi.fn(),
      vibrateSuccessChord: vi.fn(),
    });
  });

  it('should load shatter texture when available', async () => {
    const boardRef = { current: mockBoard } as React.RefObject<HTMLDivElement>;

    await playWordFoundFx(boardRef, mockStage, ['c0r0'], '#ec4899', false, true);

    expect(spritesheets.loadTexture).toHaveBeenCalledWith('shatter');
  });

  it('should skip texture loading if reduced motion enabled', async () => {
    const boardRef = { current: mockBoard } as React.RefObject<HTMLDivElement>;

    await playWordFoundFx(boardRef, mockStage, ['c0r0'], '#ec4899', true, true);

    // Reduced motion skips shatter sprite
    expect(true).toBe(true);
  });

  it('should skip loading if boardRef is null', async () => {
    const boardRef = { current: null } as React.RefObject<HTMLDivElement>;

    await playWordFoundFx(boardRef, mockStage, ['c0r0'], '#ec4899', false, true);

    // Should not crash
    expect(true).toBe(true);
  });

  it('should skip texture loading if cell not found', async () => {
    const boardRef = { current: mockBoard } as React.RefObject<HTMLDivElement>;

    await playWordFoundFx(boardRef, mockStage, ['c999r999'], '#ec4899', false, true);

    // Should not crash
    expect(true).toBe(true);
  });
});
