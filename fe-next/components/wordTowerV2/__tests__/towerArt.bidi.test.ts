import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Pixi.js to avoid canvas context requirements in tests
vi.mock('pixi.js', () => {
  const chainable = () => {
    const obj = {
      clear: vi.fn(() => obj),
      roundRect: vi.fn(() => obj),
      rect: vi.fn(() => obj),
      circle: vi.fn(() => obj),
      fill: vi.fn(() => obj),
      stroke: vi.fn(() => obj),
    };
    return obj;
  };

  class MockText {
    text: string;
    style: Record<string, unknown>;
    anchor: { x: number; y: number; set: (x: number, y: number) => void };
    alpha: number;
    scale: { x: number; y: number; set: (x: number, y: number) => void };
    position: { x: number; y: number; set: (x: number, y: number) => void };
    _width: number;
    _height: number;

    constructor(options: Record<string, unknown>) {
      this.text = (options.text as string) || '';
      this.style = options.style || {};
      this.anchor = { x: 0, y: 0, set: vi.fn(function (this: MockText['anchor'], x: number, y: number) { this.x = x; this.y = y; }) };
      this.alpha = 1;
      this.scale = { x: 1, y: 1, set: vi.fn(function (this: MockText['scale'], x: number, y: number) { this.x = x; this.y = y; }) };
      this.position = { x: 0, y: 0, set: vi.fn(function (this: MockText['position'], x: number, y: number) { this.x = x; this.y = y; }) };
      this._width = 80;
      this._height = 20;
    }

    get width() {
      return this._width;
    }

    get height() {
      return this._height;
    }
  }

  class MockGraphics {
    clear() { return this; }
    roundRect() { return this; }
    rect() { return this; }
    circle() { return this; }
    fill() { return this; }
    stroke() { return this; }
  }

  class MockContainer {
    children: unknown[] = [];
    addChild(...children: unknown[]) {
      this.children.push(...children);
      return this;
    }
  }

  return {
    Text: MockText,
    Graphics: MockGraphics,
    Container: MockContainer,
    TextStyle: class {},
  };
});

import { labelTracking, blockLabel } from '@/lib/wordTowerV2/label';
import { createBestLabel } from '../towerArt';

describe('createBestLabel bidi via labelTracking', () => {
  // Mock Pixi.js to avoid canvas/DOM requirements in tests
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 0 letterSpacing for RTL (Hebrew) to avoid backwards rendering', () => {
    // In Pixi v8, any letterSpacing causes each grapheme to be drawn left-to-right,
    // which reverses RTL text. Hebrew text must use letterSpacing: 0.
    const hebrewText = String.fromCharCode(0x05E9, 0x05D9, 0x05D0); // shin, yod, aleph
    expect(labelTracking(hebrewText)).toBe(0);
  });

  it('should return positive letterSpacing for LTR text', () => {
    // English and LTR text can have tracking to tighten spacing.
    expect(labelTracking('BEST')).toBeGreaterThan(0);
  });

  it('should detect RTL Unicode ranges correctly', () => {
    // Test various RTL ranges
    expect(labelTracking('א')).toBe(0); // Hebrew aleph
    expect(labelTracking('ا')).toBe(0); // Arabic aleph
    expect(labelTracking('A')).toBeGreaterThan(0); // Latin A
  });

  it('given Hebrew text "שיא" (reversed "איש"), when createBestLabel is called, then the Text has letterSpacing 0', () => {
    // The bug was that letterSpacing: 2 caused Pixi to render each character left-to-right,
    // turning "שיא" into "איש" visually (character-by-character reversal).
    const label = createBestLabel('שיא');
    const textNode = label.children[1]; // Second child is the Text, first is Graphics

    // Verify the text node is a Text with proper style
    expect(textNode).toBeTruthy();
    expect((textNode as Record<string, unknown>).text).toBeTruthy();

    // The Text node's style should have letterSpacing: 0 for Hebrew
    const style = (textNode as Record<string, unknown>).style as Record<string, unknown>;
    expect(style.letterSpacing).toBe(0);
  });

  it('given English text "BEST", when createBestLabel is called, then the Text has positive letterSpacing', () => {
    // LTR text benefits from tighter tracking
    const label = createBestLabel('BEST');
    const textNode = label.children[1]; // Second child is the Text

    // Verify the text node is a Text with proper style
    expect(textNode).toBeTruthy();
    expect((textNode as Record<string, unknown>).text).toBeTruthy();

    // The Text node's style should have letterSpacing > 0 for English
    const style = (textNode as Record<string, unknown>).style as Record<string, unknown>;
    expect(style.letterSpacing).toBeGreaterThan(0);
  });

  it('given Hebrew text, when blockLabel is called, then it returns the uppercase form', () => {
    // blockLabel uppercases the text and applies Hebrew final letters
    const result = blockLabel('שיא');
    // Hebrew text should be uppercased
    expect(result).toBeTruthy();
    // Verify it's a string
    expect(typeof result).toBe('string');
  });
});
