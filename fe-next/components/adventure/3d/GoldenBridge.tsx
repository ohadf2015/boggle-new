'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface GoldenBridgeProps {
  startPosition: [number, number, number];
  endPosition: [number, number, number];
  isUnlocked: boolean;
}

// Bridge letters forming the word path
const BRIDGE_LETTERS = ['W', 'O', 'R', 'D'];

// Bridge line component
function BridgeLine({
  points,
  color,
  opacity,
}: {
  points: THREE.Vector3[];
  color: string;
  opacity: number;
}) {
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
    });
    return new THREE.Line(geometry, material);
  }, [points, color, opacity]);

  return <primitive object={line} />;
}

/**
 * GoldenBridge - Letter blocks connecting two floating islands
 * Features golden metallic material with glow effect when unlocked
 */
export default function GoldenBridge({
  startPosition,
  endPosition,
  isUnlocked,
}: GoldenBridgeProps): React.JSX.Element {
  const groupRef = useRef<THREE.Group>(null);

  // Calculate bridge path points
  const bridgePoints = useMemo(() => {
    const start = new THREE.Vector3(...startPosition);
    const end = new THREE.Vector3(...endPosition);
    const points: THREE.Vector3[] = [];

    // Create intermediate points for letter blocks
    for (let i = 0; i < BRIDGE_LETTERS.length; i++) {
      const t = (i + 1) / (BRIDGE_LETTERS.length + 1);
      const point = new THREE.Vector3().lerpVectors(start, end, t);
      // Add slight curve (arch shape)
      point.z += Math.sin(t * Math.PI) * 0.5;
      points.push(point);
    }

    return points;
  }, [startPosition, endPosition]);

  // Pre-compute sparkle positions (seeded random for stability)
  const sparklePositions = useMemo(() => {
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed * 9999) * 10000;
      return x - Math.floor(x);
    };

    return bridgePoints.map((point, index) => {
      const seed = index * 12345;
      return [
        point.x + (seededRandom(seed) - 0.5) * 0.5,
        point.y + 0.3,
        point.z + (seededRandom(seed + 1) - 0.5) * 0.5,
      ] as [number, number, number];
    });
  }, [bridgePoints]);

  // Animate glow pulsation
  useFrame((state) => {
    if (groupRef.current && isUnlocked) {
      groupRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          const offset = i * 0.3;
          const scale = 1 + Math.sin(state.clock.elapsedTime * 2 + offset) * 0.05;
          child.scale.setScalar(scale);
        }
      });
    }
  });

  // Materials
  const goldMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: isUnlocked ? '#ffd700' : '#3a3a4a',
      metalness: isUnlocked ? 0.9 : 0.3,
      roughness: isUnlocked ? 0.1 : 0.7,
      emissive: isUnlocked ? '#ffa500' : '#000000',
      emissiveIntensity: isUnlocked ? 0.3 : 0,
    });
  }, [isUnlocked]);

  const lockedMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#2a2a3a',
      metalness: 0.2,
      roughness: 0.8,
      transparent: true,
      opacity: 0.6,
    });
  }, []);

  return (
    <group ref={groupRef}>
      {/* Connecting line/rope */}
      <BridgeLine
        points={[
          new THREE.Vector3(...startPosition),
          ...bridgePoints,
          new THREE.Vector3(...endPosition),
        ]}
        color={isUnlocked ? '#ffd700' : '#444466'}
        opacity={isUnlocked ? 0.6 : 0.3}
      />

      {/* Letter blocks */}
      {bridgePoints.map((point, index) => (
        <group key={index} position={[point.x, point.y, point.z]}>
          {/* Block */}
          <mesh material={isUnlocked ? goldMaterial : lockedMaterial} castShadow>
            <boxGeometry args={[0.35, 0.35, 0.35]} />
          </mesh>

          {/* Letter on front face - using Html to avoid font loading issues */}
          <Html
            position={[0, 0, 0.18]}
            center
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            <div
              className="font-bold text-sm"
              style={{ color: isUnlocked ? '#1a1a2e' : '#555577' }}
            >
              {isUnlocked ? BRIDGE_LETTERS[index] : '·'}
            </div>
          </Html>

          {/* Glow effect for unlocked bridges */}
          {isUnlocked && (
            <mesh>
              <sphereGeometry args={[0.4, 16, 16]} />
              <meshBasicMaterial
                color="#ffd700"
                transparent
                opacity={0.15}
              />
            </mesh>
          )}
        </group>
      ))}

      {/* Sparkle particles along the bridge (unlocked only) */}
      {isUnlocked &&
        sparklePositions.map((pos, index) => (
          <mesh
            key={`sparkle-${index}`}
            position={pos}
          >
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        ))}
    </group>
  );
}
