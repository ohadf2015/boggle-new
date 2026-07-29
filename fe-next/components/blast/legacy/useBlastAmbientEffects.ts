// ─── Ambient Effects Hook ──────────────────────────────────────────────
// Manages GhostEffect (chain ghost trails) and MetaballPass (goo overlay)
// from custom-pixi-particles. Activated/deactivated by chain level.

import { useCallback, useEffect, useRef } from 'react';
import { Graphics, Sprite, type Application, type Container } from 'pixi.js';
import { GhostEffect, MetaballPass } from 'custom-pixi-particles';

interface UseBlastAmbientEffectsOptions {
  app: Application;
  camera: Container;
  width: number;
  height: number;
  cellSize: number;
  chainLevel: number;
}

/**
 * Creates and manages chain-reactive ambient effects:
 * - GhostEffect: echo-sprite ghost trails activated at chain >= 2
 * - MetaballPass: liquid goo overlay on particles at chain >= 3
 *
 * Returns a function to reposition the ghost sprite (call with cleared tile centroid).
 */
export function useBlastAmbientEffects({
  app, camera, width, height, cellSize, chainLevel,
}: UseBlastAmbientEffectsOptions) {
  const ghostRef = useRef<InstanceType<typeof GhostEffect> | null>(null);
  const ghostSpriteRef = useRef<Sprite | null>(null);
  const metaballRef = useRef<InstanceType<typeof MetaballPass> | null>(null);

  // Ghost trail effect — echo-sprite at board center
  useEffect(() => {
    const g = new Graphics();
    g.circle(0, 0, cellSize * 0.4).fill({ color: 0xbfff00, alpha: 0.6 });
    const texture = app.renderer.generateTexture({ target: g, resolution: 2 });
    g.destroy();
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.x = width / 2;
    sprite.y = height / 2;
    sprite.visible = false;
    camera.addChild(sprite);
    ghostSpriteRef.current = sprite;

    const ghost = new GhostEffect(sprite, {
      spawnInterval: 0.06,
      ghostLifetime: 0.4,
      startAlpha: 0.5,
      endAlpha: 0,
      startTint: 0xbfff00,
      endTint: 0x00ffff,
      maxGhosts: 8,
    });
    camera.addChild(ghost);
    ghostRef.current = ghost;

    return () => {
      ghost.stop();
      ghost.destroy();
      ghostRef.current = null;
      if (sprite.texture) { try { sprite.texture.destroy(true); } catch { /* */ } }
      sprite.destroy();
      ghostSpriteRef.current = null;
    };
  }, [app, camera, width, height, cellSize]);

  // MetaballPass — goo blob overlay
  useEffect(() => {
    const mb = new MetaballPass({
      renderer: app.renderer,
      width: Math.round(width),
      height: Math.round(height),
      resolutionScale: 0.5,
      blurStrength: 12,
      threshold: 0.45,
      edgeSoftness: 0.15,
      autoUpdate: true,
    });
    mb.visible = false;
    camera.addChild(mb);
    metaballRef.current = mb;

    return () => {
      mb.destroy();
      metaballRef.current = null;
    };
  }, [app, camera, width, height]);

  // Activate/deactivate based on chain level
  useEffect(() => {
    const ghost = ghostRef.current;
    const ghostSprite = ghostSpriteRef.current;
    if (ghost && ghostSprite) {
      if (chainLevel >= 2) {
        ghostSprite.visible = true;
        ghost.start();
      } else {
        ghost.stop();
        ghostSprite.visible = false;
      }
    }

    const mb = metaballRef.current;
    if (mb) {
      mb.visible = chainLevel >= 3;
    }
  }, [chainLevel]);

  /** Move ghost sprite to the given position (e.g. centroid of cleared tiles). */
  const moveGhostTo = useCallback((x: number, y: number) => {
    const sprite = ghostSpriteRef.current;
    if (sprite && !sprite.destroyed && sprite.position) {
      sprite.x = x;
      sprite.y = y;
    }
  }, []);

  return { moveGhostTo };
}
