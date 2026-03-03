/**
 * PhaserCanvas — browser-only component that owns the Phaser.Game instance.
 *
 * This file is the ONLY place that imports Phaser directly.
 * It must only be loaded via: dynamic(() => import('./PhaserCanvas'), { ssr: false })
 *
 * RTL note: canvas receives explicit style="direction: ltr" to prevent
 * the page's RTL writing mode from affecting canvas coordinate system.
 */

'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createPhaserConfig, type DevicePhaserConfig } from '@/phaser/config';
import { BootScene } from '@/phaser/scenes/BootScene';
import { GameScene } from '@/phaser/scenes/GameScene';
import { AdventureScene } from '@/phaser/scenes/AdventureScene';

export interface PhaserCanvasProps {
  sceneType?: 'game' | 'adventure';
  /** Device performance config — adapts renderer and FPS for low-end devices */
  deviceConfig?: DevicePhaserConfig;
}

export default function PhaserCanvas({ sceneType = 'game', deviceConfig }: PhaserCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const scenes = sceneType === 'adventure'
      ? [BootScene, AdventureScene]
      : [BootScene, GameScene];

    const initGame = (forceCanvas: boolean) => {
      if (!containerRef.current) return;
      const effectiveDevice = forceCanvas
        ? { isLowEnd: true, targetFPS: 30 as const }
        : deviceConfig;
      const config = createPhaserConfig(containerRef.current, scenes, effectiveDevice);
      gameRef.current = new Phaser.Game(config);
      gameRef.current.canvas.style.direction = 'ltr';
    };

    // Catch WebGL framebuffer/context errors and fall back to Canvas2D
    const handleWebGLError = (event: ErrorEvent) => {
      if (event.message?.includes('Framebuffer') || event.message?.includes('WebGL')) {
        event.preventDefault();
        console.warn('[Phaser] WebGL error detected, falling back to Canvas2D');
        gameRef.current?.destroy(true);
        gameRef.current = null;
        initGame(true);
      }
    };

    window.addEventListener('error', handleWebGLError);

    try {
      initGame(false);
    } catch {
      // WebGL init can throw synchronously on some devices
      console.warn('[Phaser] Failed to init with WebGL, falling back to Canvas2D');
      initGame(true);
    }

    return () => {
      window.removeEventListener('error', handleWebGLError);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [sceneType, deviceConfig]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 touch-none"
      style={{ touchAction: 'none' }}
      data-testid="phaser-canvas-container"
    />
  );
}
