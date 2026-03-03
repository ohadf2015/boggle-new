/**
 * Phaser game configuration.
 *
 * Uses RESIZE scale mode so the canvas always fills its container.
 * Transparent background — React renders all UI behind the canvas.
 */

import Phaser from 'phaser';

export interface DevicePhaserConfig {
  /** Device is considered low-end — use Canvas2D renderer */
  isLowEnd: boolean;
  /** Target FPS — 30 for low-end, 60 for capable devices */
  targetFPS: 30 | 60;
}

/**
 * Build the Phaser.Game config for a given DOM container.
 * Scenes are injected so Adventure can swap in AdventureScene.
 *
 * When a DevicePhaserConfig is provided, the renderer and FPS are adapted:
 * - Low-end devices use Canvas2D instead of WebGL (avoids GPU driver issues)
 * - 30fps target uses setTimeout-based loop (more predictable on weak CPUs)
 */
export function createPhaserConfig(
  parent: HTMLElement,
  scenes: unknown[],
  device?: DevicePhaserConfig
): Phaser.Types.Core.GameConfig {
  const config: Phaser.Types.Core.GameConfig = {
    type: device?.isLowEnd ? Phaser.CANVAS : Phaser.AUTO,
    parent,
    width: parent.clientWidth || '100%',
    height: parent.clientHeight || '100%',
    transparent: true,
    backgroundColor: 'transparent',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: '100%',
      height: '100%',
    },
    // Disable Phaser's default banner
    banner: false,
    // Let React handle the DOM — Phaser only owns the canvas
    disableContextMenu: true,
    scene: scenes as Phaser.Types.Scenes.SceneType[],
  };

  // Cap FPS on low-end devices for smoother, more predictable frame pacing
  if (device?.targetFPS === 30) {
    config.fps = { target: 30, forceSetTimeOut: true };
  }

  return config;
}
