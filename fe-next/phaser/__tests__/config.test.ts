import Phaser from 'phaser';
import { createPhaserConfig, type DevicePhaserConfig } from '../config';

// Minimal mock parent element
function mockParent(width = 800, height = 600): HTMLElement {
  return { clientWidth: width, clientHeight: height } as HTMLElement;
}

describe('createPhaserConfig', () => {
  describe('without device config (backward compatible)', () => {
    it('should return Phaser.AUTO renderer type', () => {
      const config = createPhaserConfig(mockParent(), []);
      expect(config.type).toBe(Phaser.AUTO);
    });

    it('should not set fps config', () => {
      const config = createPhaserConfig(mockParent(), []);
      expect(config.fps).toBeUndefined();
    });

    it('should set transparent background and RESIZE scale mode', () => {
      const config = createPhaserConfig(mockParent(), []);
      expect(config.transparent).toBe(true);
      expect(config.scale?.mode).toBe(Phaser.Scale.RESIZE);
    });
  });

  describe('with device config — high-end device', () => {
    const highEnd: DevicePhaserConfig = { isLowEnd: false, targetFPS: 60 };

    it('should return Phaser.AUTO renderer type', () => {
      const config = createPhaserConfig(mockParent(), [], highEnd);
      expect(config.type).toBe(Phaser.AUTO);
    });

    it('should not set fps config for 60fps target', () => {
      const config = createPhaserConfig(mockParent(), [], highEnd);
      expect(config.fps).toBeUndefined();
    });
  });

  describe('with device config — low-end device', () => {
    const lowEnd: DevicePhaserConfig = { isLowEnd: true, targetFPS: 30 };

    it('should return Phaser.CANVAS renderer type', () => {
      const config = createPhaserConfig(mockParent(), [], lowEnd);
      expect(config.type).toBe(Phaser.CANVAS);
    });

    it('should set fps target to 30 with forceSetTimeOut', () => {
      const config = createPhaserConfig(mockParent(), [], lowEnd);
      expect(config.fps).toEqual({
        target: 30,
        forceSetTimeOut: true,
      });
    });

    it('should preserve all other config properties', () => {
      const config = createPhaserConfig(mockParent(), [], lowEnd);
      expect(config.transparent).toBe(true);
      expect(config.banner).toBe(false);
      expect(config.disableContextMenu).toBe(true);
      expect(config.scale?.mode).toBe(Phaser.Scale.RESIZE);
    });
  });

  describe('with mixed config — low-end but 60fps target', () => {
    const mixed: DevicePhaserConfig = { isLowEnd: true, targetFPS: 60 };

    it('should use Canvas renderer for low-end regardless of FPS', () => {
      const config = createPhaserConfig(mockParent(), [], mixed);
      expect(config.type).toBe(Phaser.CANVAS);
    });

    it('should not set fps config when target is 60', () => {
      const config = createPhaserConfig(mockParent(), [], mixed);
      expect(config.fps).toBeUndefined();
    });
  });

  it('should pass scenes through to config', () => {
    const scenes = [class TestScene {}];
    const config = createPhaserConfig(mockParent(), scenes);
    expect(config.scene).toBe(scenes);
  });

  it('should use parent dimensions for width and height', () => {
    const config = createPhaserConfig(mockParent(1024, 768), []);
    expect(config.width).toBe(1024);
    expect(config.height).toBe(768);
  });
});
