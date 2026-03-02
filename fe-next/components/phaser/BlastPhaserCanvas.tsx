/**
 * BlastPhaserCanvas — browser-only component for Blast mode Phaser canvas.
 *
 * Loads BootScene + BlastScene. Must be imported via:
 *   dynamic(() => import('./BlastPhaserCanvas'), { ssr: false })
 *
 * RTL note: canvas receives explicit style="direction: ltr" to prevent
 * the page's RTL writing mode from affecting canvas coordinate system.
 */

'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createPhaserConfig } from '@/phaser/config';
import { BootScene } from '@/phaser/scenes/BootScene';
import { BlastScene } from '@/phaser/scenes/BlastScene';

export default function BlastPhaserCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const scenes = [BootScene, BlastScene];
    const config = createPhaserConfig(containerRef.current, scenes);
    gameRef.current = new Phaser.Game(config);

    // Explicit LTR prevents RTL page direction from flipping canvas coords
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
      data-testid="blast-phaser-canvas-container"
    />
  );
}
