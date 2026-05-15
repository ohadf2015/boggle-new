// ─── ScreenFlash Tests ────────────────────────────────────────────────

import { ScreenFlash } from '../ScreenFlash';
import { Container, Graphics } from 'pixi.js';

jest.mock('pixi.js', () => {
  const mockGraphics = {
    clear: jest.fn().mockReturnThis(),
    rect: jest.fn().mockReturnThis(),
    fill: jest.fn().mockReturnThis(),
    destroy: jest.fn(function (this: { destroyed: boolean }) {
      this.destroyed = true;
    }),
    destroyed: false,
    alpha: 0,
    visible: false,
  };
  const mockContainer = {
    addChild: jest.fn(),
    removeChild: jest.fn(),
    destroy: jest.fn(),
  };
  return {
    Container: jest.fn(() => mockContainer),
    Graphics: jest.fn(() => mockGraphics),
  };
});

describe('ScreenFlash', () => {
  let parent: Container;
  let flash: ScreenFlash;

  beforeEach(() => {
    parent = new Container();
    flash = new ScreenFlash(parent, 400, 600);
  });

  afterEach(() => {
    flash.destroy();
  });

  it('should not be active initially', () => {
    expect(flash.isActive).toBe(false);
  });

  it('should become active after flash()', () => {
    flash.flash({ color: 0xff0000, duration: 0.3, intensity: 0.8 });
    expect(flash.isActive).toBe(true);
  });

  it('should deactivate after duration expires', () => {
    flash.flash({ color: 0xff0000, duration: 0.2, intensity: 1 });
    flash.update(0.1);
    expect(flash.isActive).toBe(true);

    flash.update(0.15);
    expect(flash.isActive).toBe(false);
  });

  it('should support multiple concurrent flashes', () => {
    flash.flash({ color: 0xff0000, duration: 0.2, intensity: 0.5 });
    flash.flash({ color: 0x00ff00, duration: 0.4, intensity: 0.5 });

    flash.update(0.25); // First flash done, second still active
    expect(flash.isActive).toBe(true);

    flash.update(0.2); // Both done
    expect(flash.isActive).toBe(false);
  });

  it('should provide convenience presets', () => {
    flash.white();
    expect(flash.isActive).toBe(true);
  });

  it('should provide combo flash preset', () => {
    flash.combo();
    expect(flash.isActive).toBe(true);
  });

  it('should provide danger flash preset', () => {
    flash.danger();
    expect(flash.isActive).toBe(true);
  });

  it('does not crash if underlying graphics was destroyed by parent (children:true)', () => {
    flash.flash({ color: 0xff0000, duration: 0.2, intensity: 0.8 });
    // Simulate parent.destroy({ children: true }) flipping the Graphics.destroyed flag
    // BEFORE our own ScreenFlash.destroy() runs — the production race that
    // produced "Cannot read properties of null (reading 'clear')" in Sentry.
    (flash as unknown as { graphics: { destroyed: boolean } }).graphics.destroyed = true;
    expect(() => flash.update(0.1)).not.toThrow();
  });
});
