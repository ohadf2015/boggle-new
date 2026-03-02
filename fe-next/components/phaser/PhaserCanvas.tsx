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
import { createPhaserConfig } from '@/phaser/config';
import { BootScene } from '@/phaser/scenes/BootScene';
import { GameScene } from '@/phaser/scenes/GameScene';
import { AdventureScene } from '@/phaser/scenes/AdventureScene';

export interface PhaserCanvasProps {
  sceneType?: 'game' | 'adventure';
}

export default function PhaserCanvas({ sceneType = 'game' }: PhaserCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const scenes = sceneType === 'adventure'
      ? [BootScene, AdventureScene]
      : [BootScene, GameScene];

    const config = createPhaserConfig(containerRef.current, scenes);
    gameRef.current = new Phaser.Game(config);

    // Explicit LTR prevents RTL page direction from flipping canvas coords
    gameRef.current.canvas.style.direction = 'ltr';

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [sceneType]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 touch-none"
      style={{ touchAction: 'none' }}
      data-testid="phaser-canvas-container"
    />
  );
}
