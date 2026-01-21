'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { WorldConfig } from '@/lib/adventure';

interface FloatingIslandProps {
  world: WorldConfig;
  isUnlocked: boolean;
  unlockRequirement: number;
  currentStars: number;
  completedLevels: number;
  totalWorldStars: number;
  position: [number, number, number];
  isHovered: boolean;
  onHover: () => void;
  onUnhover: () => void;
  onClick: () => void;
}

// Color mapping for world themes
const WORLD_COLORS: Record<string, { primary: string; secondary: string; emissive: string }> = {
  'neo-lime': { primary: '#84cc16', secondary: '#65a30d', emissive: '#84cc16' },
  'neo-cyan': { primary: '#00ffff', secondary: '#06b6d4', emissive: '#00ffff' },
  'neo-purple': { primary: '#8b5cf6', secondary: '#7c3aed', emissive: '#8b5cf6' },
  'neo-orange': { primary: '#ff6b35', secondary: '#ea580c', emissive: '#ff6b35' },
  'neo-red': { primary: '#ef4444', secondary: '#dc2626', emissive: '#ef4444' },
  'neo-pink': { primary: '#ff1493', secondary: '#db2777', emissive: '#ff1493' },
  'neo-yellow': { primary: '#ffe135', secondary: '#eab308', emissive: '#ffd700' },
  'neo-white': { primary: '#ffffff', secondary: '#e0f2fe', emissive: '#87ceeb' },
};

// World icons (emoji for 3D text display)
const WORLD_ICONS: Record<number, string> = {
  1: '🌸',
  2: '🌊',
  3: '🔮',
  4: '🏝️',
  5: '🏜️',
  6: '🌀',
  7: '🪞',
  8: '🌌',
  9: '🏔️',
  10: '👑',
};

/**
 * FloatingIsland - 3D floating island mesh representing a world
 * Features procedural geometry, world-specific colors, and interaction states
 */
export default function FloatingIsland({
  world,
  isUnlocked,
  unlockRequirement,
  currentStars,
  completedLevels,
  totalWorldStars,
  position,
  isHovered,
  onHover,
  onUnhover,
  onClick,
}: FloatingIslandProps): React.JSX.Element {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const isComplete = completedLevels === 10;
  const isFinalWorld = world.id === 10;

  // Get colors for this world
  const colors = WORLD_COLORS[world.colorPrimary] || WORLD_COLORS['neo-cyan'];

  // Animate glow intensity on hover
  useFrame((state) => {
    if (glowRef.current && isUnlocked) {
      const intensity = isHovered ? 0.8 : 0.3;
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = intensity + pulse;
    }
  });

  // Create island base geometry (stylized cylinder with beveled edges)
  const islandGeometry = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(1.8, 2.2, 0.8, 8, 1);
    return geometry;
  }, []);

  // Create island top (flat surface)
  const topGeometry = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(1.6, 1.8, 0.2, 8, 1);
    return geometry;
  }, []);

  // Create glow plane
  const glowGeometry = useMemo(() => {
    return new THREE.CircleGeometry(2.5, 32);
  }, []);

  // Materials
  const baseMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isUnlocked ? colors.secondary : '#2a2a4a',
      roughness: 0.7,
      metalness: 0.2,
    });
  }, [isUnlocked, colors.secondary]);

  const topMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isUnlocked ? colors.primary : '#3a3a5a',
      roughness: 0.5,
      metalness: 0.3,
      emissive: isUnlocked ? colors.emissive : '#000000',
      emissiveIntensity: isUnlocked ? (isHovered ? 0.4 : 0.2) : 0,
    });
  }, [isUnlocked, colors.primary, colors.emissive, isHovered]);

  const glowMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: colors.emissive,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
  }, [colors.emissive]);

  return (
    <Float
      speed={isUnlocked ? 2 : 0.5}
      rotationIntensity={isUnlocked ? 0.2 : 0.05}
      floatIntensity={isUnlocked ? 0.5 : 0.1}
    >
      <group
        ref={groupRef}
        position={position}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (isUnlocked) {
            document.body.style.cursor = 'pointer';
            onHover();
          }
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
          onUnhover();
        }}
        scale={isHovered && isUnlocked ? 1.1 : 1}
      >
        {/* Glow plane below island */}
        {isUnlocked && (
          <mesh
            ref={glowRef}
            geometry={glowGeometry}
            material={glowMaterial}
            position={[0, -0.5, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          />
        )}

        {/* Island base */}
        <mesh
          geometry={islandGeometry}
          material={baseMaterial}
          position={[0, -0.3, 0]}
          castShadow
          receiveShadow
        />

        {/* Island top surface */}
        <mesh
          geometry={topGeometry}
          material={topMaterial}
          position={[0, 0.1, 0]}
          castShadow
          receiveShadow
        />

        {/* World name label - using Html to avoid font loading issues */}
        <Html
          position={[0, 0.6, 0]}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div
            className="font-bold text-sm tracking-wide"
            style={{
              color: isUnlocked ? '#ffffff' : '#666688',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            }}
          >
            {world.name.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
          </div>
        </Html>

        {/* World icon */}
        <Html
          position={[0, 1.1, 0]}
          center
          style={{
            fontSize: '1.5rem',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {WORLD_ICONS[world.id] || '⭐'}
        </Html>

        {/* Star progress - using Html to avoid font loading issues */}
        <Html
          position={[0, -0.6, 1]}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            className="font-bold text-xs"
            style={{ color: isUnlocked ? '#ffd700' : '#444466' }}
          >
            ⭐ {currentStars}/{totalWorldStars}
          </div>
        </Html>

        {/* Lock overlay for locked worlds */}
        {!isUnlocked && (
          <Html
            position={[0, 0.3, 0.5]}
            center
            style={{
              background: 'rgba(0,0,0,0.7)',
              padding: '8px 16px',
              borderRadius: '8px',
              pointerEvents: 'none',
            }}
          >
            <div className="flex flex-col items-center gap-1">
              <span style={{ fontSize: '1.5rem' }}>🔒</span>
              <span className="text-neo-white text-xs font-bold">
                {unlockRequirement} ⭐
              </span>
            </div>
          </Html>
        )}

        {/* Complete badge */}
        {isComplete && (
          <Html position={[1.2, 0.5, 0]} center>
            <div className="bg-neo-yellow border-2 border-neo-black rounded-full p-1 shadow-hard-sm">
              <span style={{ fontSize: '0.8rem' }}>✓</span>
            </div>
          </Html>
        )}

        {/* Crown for final world */}
        {isFinalWorld && isUnlocked && (
          <mesh position={[0, 1.5, 0]}>
            <coneGeometry args={[0.3, 0.4, 5]} />
            <meshStandardMaterial
              color="#ffd700"
              metalness={0.8}
              roughness={0.2}
              emissive="#ffd700"
              emissiveIntensity={0.3}
            />
          </mesh>
        )}

        {/* Small decorative elements on the island */}
        {isUnlocked && (
          <>
            {/* Letter blocks on island surface */}
            {['L', 'E', 'X', 'I'].map((letter, i) => (
              <mesh
                key={letter}
                position={[
                  Math.cos((i / 4) * Math.PI * 2) * 0.8,
                  0.35,
                  Math.sin((i / 4) * Math.PI * 2) * 0.8,
                ]}
                rotation={[0, (i / 4) * Math.PI * 2, 0]}
              >
                <boxGeometry args={[0.2, 0.2, 0.2]} />
                <meshStandardMaterial
                  color="#ffe135"
                  metalness={0.3}
                  roughness={0.5}
                />
              </mesh>
            ))}
          </>
        )}
      </group>
    </Float>
  );
}
