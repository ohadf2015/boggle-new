'use client';

import React, { Suspense, useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useProgress, Html, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { usePerformanceTier, getQualitySettings } from '@/hooks/usePerformanceTier';
import {
  WORLD_CONFIGS,
  LEVELS_PER_WORLD,
  MAX_STARS_PER_LEVEL,
  getWorldUnlockRequirement,
  isWorldUnlocked,
  type WorldConfig,
} from '@/lib/adventure';
import FloatingIsland from './FloatingIsland';
import GoldenBridge from './GoldenBridge';
import FloatingDecorations from './FloatingDecorations';
import CloudParticles from './CloudParticles';

interface WorldMap3DProps {
  totalStars: number;
  completions: Array<{ world: number; level: number; stars: number }>;
  onWorldSelect: (worldId: number) => void;
  onError?: () => void;
}

// Camera controller that follows scroll position
function CameraController({ targetY }: { targetY: number }) {
  const { camera } = useThree();
  const currentY = useRef(targetY);

  useFrame(() => {
    // Smooth interpolation to target Y position
    currentY.current = THREE.MathUtils.lerp(currentY.current, targetY, 0.05);
    // eslint-disable-next-line react-hooks/immutability -- R3F pattern: camera mutation in useFrame is expected
    camera.position.y = currentY.current;
    camera.lookAt(0, currentY.current, 0);
  });

  return null;
}

// Loading fallback with progress
function LoadingFallback() {
  const { progress } = useProgress();

  return (
    <Html center>
      <div className="flex flex-col items-center gap-3 p-6 bg-neo-navy/90 border-3 border-neo-white/20 rounded-neo">
        <div className="w-48 h-3 bg-neo-navy-light rounded-full overflow-hidden border-2 border-neo-white/30">
          <div
            className="h-full bg-neo-lime transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-neo-white font-bold text-sm">
          Loading worlds... {Math.round(progress)}%
        </p>
      </div>
    </Html>
  );
}

// Scene content with all 3D elements
function SceneContent({
  worldsData,
  onWorldSelect,
  qualitySettings,
  scrollProgress,
}: {
  worldsData: Array<{
    world: WorldConfig;
    isUnlocked: boolean;
    unlockRequirement: number;
    currentStars: number;
    completedLevels: number;
    totalWorldStars: number;
    yPosition: number;
  }>;
  onWorldSelect: (worldId: number) => void;
  qualitySettings: ReturnType<typeof getQualitySettings>;
  scrollProgress: number;
}) {
  const [hoveredWorld, setHoveredWorld] = useState<number | null>(null);

  // Calculate camera Y based on scroll (islands go from bottom to top)
  // World 1 is at bottom (lowest Y), World 10 is at top (highest Y)
  const minY = worldsData[worldsData.length - 1]?.yPosition || 0; // World 1
  const maxY = worldsData[0]?.yPosition || 30; // World 10
  const cameraY = minY + (maxY - minY) * scrollProgress;

  return (
    <>
      {/* Camera follows scroll */}
      <CameraController targetY={cameraY} />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        color="#fff5e0"
        castShadow={qualitySettings.shadows}
      />
      <pointLight position={[-10, 10, -10]} intensity={0.3} color="#87ceeb" />

      {/* Stars background */}
      <Stars
        radius={100}
        depth={50}
        count={qualitySettings.particleCount * 5}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />

      {/* Sky gradient for night atmosphere (no external HDR dependency) */}
      <color attach="background" args={['#0a0a1a']} />
      <fog attach="fog" args={['#0a0a1a', 30, 100]} />

      {/* Additional rim lighting for depth */}
      <pointLight position={[0, -20, 0]} intensity={0.2} color="#1a1a3a" />

      {/* Clouds */}
      <CloudParticles count={qualitySettings.cloudCount} />

      {/* Floating decorations */}
      <FloatingDecorations count={qualitySettings.decorationCount} />

      {/* World islands */}
      {worldsData.map((data, index) => (
        <React.Fragment key={data.world.id}>
          <FloatingIsland
            world={data.world}
            isUnlocked={data.isUnlocked}
            unlockRequirement={data.unlockRequirement}
            currentStars={data.currentStars}
            completedLevels={data.completedLevels}
            totalWorldStars={data.totalWorldStars}
            position={[
              // Alternate X position for visual interest
              index % 2 === 0 ? -1 : 1,
              data.yPosition,
              0,
            ]}
            isHovered={hoveredWorld === data.world.id}
            onHover={() => setHoveredWorld(data.world.id)}
            onUnhover={() => setHoveredWorld(null)}
            onClick={() => data.isUnlocked && onWorldSelect(data.world.id)}
          />

          {/* Bridge to next world (except for last/first in display order) */}
          {index < worldsData.length - 1 && (
            <GoldenBridge
              startPosition={[
                index % 2 === 0 ? -1 : 1,
                data.yPosition,
                0,
              ]}
              endPosition={[
                (index + 1) % 2 === 0 ? -1 : 1,
                worldsData[index + 1].yPosition,
                0,
              ]}
              isUnlocked={worldsData[index + 1].isUnlocked}
            />
          )}
        </React.Fragment>
      ))}

      {/* Post-processing effects */}
      {qualitySettings.postProcessing && (
        <EffectComposer>
          <Bloom
            intensity={0.5}
            luminanceThreshold={0.6}
            luminanceSmoothing={0.9}
          />
        </EffectComposer>
      )}
    </>
  );
}

/**
 * WorldMap3D - Immersive 3D floating islands world map
 * Uses React Three Fiber for true 3D perspective and depth
 */
export default function WorldMap3D({
  totalStars,
  completions,
  onWorldSelect,
  onError,
}: WorldMap3DProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasError, setHasError] = useState(false);
  const performanceMetrics = usePerformanceTier();
  const qualitySettings = getQualitySettings(performanceMetrics.tier);

  // Use ref to store onError to avoid re-running effects when it changes
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Handle WebGL context errors
  const handleCanvasError = useCallback(() => {
    console.error('WorldMap3D: WebGL context error');
    setHasError(true);
    onErrorRef.current?.();
  }, []);

  // Check for WebGL support on mount (runs only once)
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) {
        console.warn('WorldMap3D: WebGL not supported');
        setHasError(true);
        onErrorRef.current?.();
      }
    } catch (error) {
      console.error('WorldMap3D: Error checking WebGL support', error);
      setHasError(true);
      onErrorRef.current?.();
    }
  }, []); // Empty dependency array - runs only once on mount

  // Handle scroll for camera movement - must be before early return
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight - target.clientHeight;
    const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
    setScrollProgress(progress);
  }, []);

  // Prepare worlds data (reversed for bottom-to-top display) - must be before early return
  const worldsData = useMemo(() => {
    // Process worlds: World 1 at bottom, World 10 at top
    return WORLD_CONFIGS.map((world, index) => {
      const isUnlocked = isWorldUnlocked(world.id, totalStars);
      const unlockRequirement = getWorldUnlockRequirement(world.id);
      const worldCompletions = completions.filter((c) => c.world === world.id);
      const worldStars = worldCompletions.reduce((sum, c) => sum + c.stars, 0);
      const totalWorldStars = LEVELS_PER_WORLD * MAX_STARS_PER_LEVEL;

      // Y position: World 1 at y=0, increasing up
      // Each world is 4 units apart
      const yPosition = index * 4;

      return {
        world,
        isUnlocked,
        unlockRequirement,
        currentStars: worldStars,
        completedLevels: worldCompletions.length,
        totalWorldStars,
        yPosition,
      };
    }).reverse(); // Reverse so World 10 is first (highest Y) for rendering
  }, [totalStars, completions]);

  // If there's an error, don't render anything (parent will handle fallback)
  if (hasError) {
    return <></>;
  }

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100vh-12rem)] w-full overflow-y-auto scrollbar-thin scrollbar-thumb-neo-white/20 scrollbar-track-transparent"
      onScroll={handleScroll}
    >
      {/* Scrollable height to enable scrolling */}
      <div style={{ height: '200vh' }} />

      {/* Fixed 3D canvas */}
      <div className="fixed inset-0 top-[6rem]" style={{ pointerEvents: 'auto' }}>
        <Canvas
          shadows={qualitySettings.shadows}
          dpr={qualitySettings.pixelRatio}
          gl={{
            antialias: qualitySettings.antialias,
            powerPreference: performanceMetrics.tier === 'high' ? 'high-performance' : 'default',
            failIfMajorPerformanceCaveat: false,
          }}
          camera={{
            position: [0, 0, 12],
            fov: 50,
            near: 0.1,
            far: 200,
          }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', handleCanvasError);
          }}
        >
          <Suspense fallback={<LoadingFallback />}>
            <SceneContent
              worldsData={worldsData}
              onWorldSelect={onWorldSelect}
              qualitySettings={qualitySettings}
              scrollProgress={scrollProgress}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Scroll hint overlay */}
      {scrollProgress < 0.1 && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <div className="px-4 py-2 bg-neo-black/50 rounded-full text-neo-white/70 text-sm font-medium backdrop-blur-sm">
            Scroll to explore worlds ↓
          </div>
        </div>
      )}
    </div>
  );
}
