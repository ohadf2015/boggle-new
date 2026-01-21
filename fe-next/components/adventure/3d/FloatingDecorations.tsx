'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';
import * as THREE from 'three';

interface FloatingDecorationsProps {
  count: number;
}

type DecorationType = 'book' | 'scroll' | 'pencil' | 'star' | 'letter';

interface DecorationData {
  type: DecorationType;
  position: THREE.Vector3;
  scale: number;
  rotationSpeed: number;
  floatSpeed: number;
  floatIntensity: number;
  color: string;
}

// Decoration emojis for Html overlay
const DECORATION_EMOJIS: Record<DecorationType, string> = {
  book: '📖',
  scroll: '📜',
  pencil: '✏️',
  star: '✨',
  letter: '🔤',
};

// Colors for different decoration types
const DECORATION_COLORS: Record<DecorationType, string> = {
  book: '#8b4513',
  scroll: '#f4e4c1',
  pencil: '#ffd700',
  star: '#ffffff',
  letter: '#ffe135',
};

/**
 * FloatingDecorations - Floating books, scrolls, and pencils throughout the scene
 * Adds magical atmosphere with gentle animations
 */
export default function FloatingDecorations({ count }: FloatingDecorationsProps): React.JSX.Element {
  const groupRef = useRef<THREE.Group>(null);

  // Generate decoration data
  const decorations = useMemo((): DecorationData[] => {
    const types: DecorationType[] = ['book', 'scroll', 'pencil', 'star', 'letter'];

    const seededRandom = (seed: number) => {
      const x = Math.sin(seed * 9999) * 10000;
      return x - Math.floor(x);
    };

    return Array.from({ length: count }, (_, i) => {
      const seed = i * 54321;
      const type = types[Math.floor(seededRandom(seed) * types.length)];

      return {
        type,
        position: new THREE.Vector3(
          (seededRandom(seed + 1) - 0.5) * 20, // X spread
          seededRandom(seed + 2) * 36, // Y (across world height)
          (seededRandom(seed + 3) - 0.5) * 10 - 3, // Z (slightly in front/behind)
        ),
        scale: 0.3 + seededRandom(seed + 4) * 0.5,
        rotationSpeed: 0.2 + seededRandom(seed + 5) * 0.5,
        floatSpeed: 1 + seededRandom(seed + 6) * 2,
        floatIntensity: 0.3 + seededRandom(seed + 7) * 0.5,
        color: DECORATION_COLORS[type],
      };
    });
  }, [count]);

  // Animate rotation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Group) {
          const decoration = decorations[i];
          // Gentle rotation
          child.rotation.y = state.clock.elapsedTime * decoration.rotationSpeed;
          child.rotation.z = Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.1;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {decorations.map((decoration, index) => (
        <Float
          key={index}
          speed={decoration.floatSpeed}
          rotationIntensity={0.3}
          floatIntensity={decoration.floatIntensity}
        >
          <group
            position={decoration.position}
            scale={decoration.scale}
          >
            {/* 3D mesh representation */}
            {decoration.type === 'book' && (
              <mesh castShadow>
                <boxGeometry args={[0.8, 0.1, 0.6]} />
                <meshStandardMaterial
                  color={decoration.color}
                  roughness={0.8}
                  metalness={0.1}
                />
              </mesh>
            )}

            {decoration.type === 'scroll' && (
              <mesh castShadow>
                <cylinderGeometry args={[0.1, 0.1, 0.6, 16]} />
                <meshStandardMaterial
                  color={decoration.color}
                  roughness={0.9}
                  metalness={0}
                />
              </mesh>
            )}

            {decoration.type === 'pencil' && (
              <group>
                {/* Pencil body */}
                <mesh position={[0, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.05, 0.05, 0.5, 6]} />
                  <meshStandardMaterial
                    color={decoration.color}
                    roughness={0.5}
                    metalness={0.3}
                  />
                </mesh>
                {/* Pencil tip */}
                <mesh position={[0, 0.3, 0]} castShadow>
                  <coneGeometry args={[0.05, 0.1, 6]} />
                  <meshStandardMaterial
                    color="#f5deb3"
                    roughness={0.7}
                  />
                </mesh>
              </group>
            )}

            {decoration.type === 'star' && (
              <mesh castShadow>
                <octahedronGeometry args={[0.15, 0]} />
                <meshStandardMaterial
                  color={decoration.color}
                  emissive={decoration.color}
                  emissiveIntensity={0.5}
                  roughness={0.2}
                  metalness={0.8}
                />
              </mesh>
            )}

            {decoration.type === 'letter' && (
              <mesh castShadow>
                <boxGeometry args={[0.3, 0.3, 0.1]} />
                <meshStandardMaterial
                  color={decoration.color}
                  roughness={0.5}
                  metalness={0.3}
                />
              </mesh>
            )}

            {/* Emoji overlay for added visual charm */}
            <Html
              center
              style={{
                fontSize: `${decoration.scale * 2}rem`,
                pointerEvents: 'none',
                userSelect: 'none',
                opacity: 0.8,
              }}
            >
              {DECORATION_EMOJIS[decoration.type]}
            </Html>
          </group>
        </Float>
      ))}
    </group>
  );
}
