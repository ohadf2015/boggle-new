/**
 * Phaser game configuration.
 *
 * Uses RESIZE scale mode so the canvas always fills its container.
 * Transparent background — React renders all UI behind the canvas.
 */

import Phaser from 'phaser';

/**
 * Build the Phaser.Game config for a given DOM container.
 * Scenes are injected so Adventure can swap in AdventureScene.
 */
export function createPhaserConfig(
  parent: HTMLElement,
  scenes: unknown[]
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
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
    // Matter.js for tile physics (static at rest, dynamic during animations)
    physics: {
      default: 'matter',
      matter: {
        gravity: { x: 0, y: 0 },
        debug: process.env.NODE_ENV === 'development',
      },
    },
    // Disable Phaser's default banner
    banner: false,
    // Let React handle the DOM — Phaser only owns the canvas
    disableContextMenu: true,
    scene: scenes as Phaser.Types.Scenes.SceneType[],
  };
}
