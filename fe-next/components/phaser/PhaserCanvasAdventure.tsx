/**
 * PhaserCanvasAdventure — browser-only canvas for Adventure mode.
 *
 * Uses BootScene + AdventureScene instead of GameScene.
 * Only imported via dynamic({ ssr: false }).
 */

'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createPhaserConfig } from '@/phaser/config';
import { BootScene } from '@/phaser/scenes/BootScene';
import { AdventureScene } from '@/phaser/scenes/AdventureScene';

export default function PhaserCanvasAdventure() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config = createPhaserConfig(containerRef.current, [BootScene, AdventureScene]);
    gameRef.current = new Phaser.Game(config);
    gameRef.current.canvas.style.direction = 'ltr';

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 touch-none"
      style={{ touchAction: 'none' }}
      data-testid="phaser-canvas-adventure-container"
    />
  );
}
