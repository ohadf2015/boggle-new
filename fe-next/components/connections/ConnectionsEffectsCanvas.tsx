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

// Heart-shatter at the lives indicator: tighter, pinker, hard gravity.
const LIFE_LOST_BURST: ParticleConfig = {
  maxParticles: 30,
  frequency: 0.001,
  emitterLifetime: 0.12,
  particlesPerWave: 30,
  lifetime: { min: 0.3, max: 0.7 },
  speed: { min: 80, max: 240 },
  gravity: { x: 0, y: 320 },
  scale: { start: 0.6, end: 0 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -240, max: 240 },
  colors: ['ff1493', 'ff3366', 'ffffff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 12 },
  blendMode: 'add',
  shape: 'diamond',
};

// Level-up celebration at the level badge: cyan + lime + gold.
const LEVEL_UP_BURST: ParticleConfig = {
  maxParticles: 60,
  frequency: 0.001,
  emitterLifetime: 0.18,
  particlesPerWave: 60,
  lifetime: { min: 0.5, max: 1.1 },
  speed: { min: 120, max: 360 },
  gravity: { x: 0, y: 220 },
  scale: { start: 0.9, end: 0 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -200, max: 200 },
  colors: ['00ffff', 'bfff00', 'ffe135', 'ffffff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 18 },
  blendMode: 'add',
  shape: 'star',
};

// Game-over: heavy red rain.
const GAME_OVER_BURST: ParticleConfig = {
  maxParticles: 80,
  frequency: 0.001,
  emitterLifetime: 0.2,
  particlesPerWave: 80,
  lifetime: { min: 0.6, max: 1.4 },
  speed: { min: 100, max: 420 },
  gravity: { x: 0, y: 500 },
  scale: { start: 1.1, end: 0 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -300, max: 300 },
  colors: ['ff1493', 'ff3366', 'ff6b35'],
  spawnShape: 'burst',
  spawnConfig: { directions: 24 },
  blendMode: 'add',
  shape: 'diamond',
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
    const handleLifeLost = (e: Event) => {
      const detail = (e as CustomEvent<{ x: number; y: number }>).detail;
      const x = detail?.x ?? cx;
      const y = detail?.y ?? cy;
      particles.burst(LIFE_LOST_BURST, x, y);
      shake.medium();
    };
    const handleLevelUp = (e: Event) => {
      const detail = (e as CustomEvent<{ x: number; y: number }>).detail;
      const x = detail?.x ?? cx;
      const y = detail?.y ?? cy;
      particles.burst(LEVEL_UP_BURST, x, y);
      flash.combo();
    };
    const handleGameOver = () => {
      particles.burst(GAME_OVER_BURST, cx, cy);
      flash.danger();
      shake.heavy();
    };
    window.addEventListener('connections:correct', handleCorrect);
    window.addEventListener('connections:wrong', handleWrong);
    window.addEventListener('connections:lifeLost', handleLifeLost);
    window.addEventListener('connections:levelUp', handleLevelUp);
    window.addEventListener('connections:gameOver', handleGameOver);
    return () => {
      window.removeEventListener('connections:correct', handleCorrect);
      window.removeEventListener('connections:wrong', handleWrong);
      window.removeEventListener('connections:lifeLost', handleLifeLost);
      window.removeEventListener('connections:levelUp', handleLevelUp);
      window.removeEventListener('connections:gameOver', handleGameOver);
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
