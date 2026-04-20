'use client';
'use no memo';

import { useEffect } from 'react';
import { GameCanvas, useGameEngine } from '@/lib/gameEngine/GameCanvas';
import type { ParticleConfig } from '@/lib/gameEngine/types';

const CORRECT_BURST: ParticleConfig = {
  maxParticles: 50,
  frequency: 0.001,
  emitterLifetime: 0.15,
  particlesPerWave: 50,
  lifetime: { min: 0.4, max: 1.0 },
  speed: { min: 80, max: 320 },
  gravity: { x: 0, y: 200 },
  scale: { start: 0.8, end: 0 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -180, max: 180 },
  colors: ['bfff00', '00ffff', 'ffe135', 'ffffff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 16 },
  blendMode: 'add',
  shape: 'star',
};

const WRONG_BURST: ParticleConfig = {
  maxParticles: 25,
  frequency: 0.001,
  emitterLifetime: 0.1,
  particlesPerWave: 25,
  lifetime: { min: 0.25, max: 0.6 },
  speed: { min: 60, max: 200 },
  gravity: { x: 0, y: 180 },
  scale: { start: 0.7, end: 0 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -120, max: 120 },
  colors: ['ff3366', 'ff6b35', 'ffffff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 10 },
  blendMode: 'add',
};

function EffectsLayer({ width, height }: { width: number; height: number }) {
  const { particles, flash, shake } = useGameEngine();
  const cx = width / 2;
  const cy = height / 2;

  useEffect(() => {
    const handleCorrect = () => {
      particles.burst(CORRECT_BURST, cx, cy);
      flash.white();
    };
    const handleWrong = () => {
      particles.burst(WRONG_BURST, cx, cy);
      flash.danger();
      shake.light();
    };
    window.addEventListener('connections:correct', handleCorrect);
    window.addEventListener('connections:wrong', handleWrong);
    return () => {
      window.removeEventListener('connections:correct', handleCorrect);
      window.removeEventListener('connections:wrong', handleWrong);
    };
  }, [particles, flash, shake, cx, cy]);

  return null;
}

interface ConnectionsEffectsCanvasProps {
  width: number;
  height: number;
}

export default function ConnectionsEffectsCanvas({ width, height }: ConnectionsEffectsCanvasProps) {
  if (width <= 0 || height <= 0) return null;
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      <GameCanvas
        config={{
          width,
          height,
          background: 0x000000,
          backgroundAlpha: 0,
          antialias: true,
        }}
        usePhysics={false}
        className="absolute inset-0"
      >
        <EffectsLayer width={width} height={height} />
      </GameCanvas>
    </div>
  );
}
