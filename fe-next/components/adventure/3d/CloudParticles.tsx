'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CloudParticlesProps {
  count: number;
}

interface CloudData {
  position: THREE.Vector3;
  scale: number;
  speed: number;
  opacity: number;
}

/**
 * CloudParticles - Atmospheric cloud sprites at various depths
 * Creates parallax depth effect with slowly drifting clouds
 */
export default function CloudParticles({ count }: CloudParticlesProps): React.JSX.Element | null {
  const groupRef = useRef<THREE.Group>(null);
  const [cloudTexture, setCloudTexture] = useState<THREE.CanvasTexture | null>(null);

  // Generate cloud data with seeded random for consistency
  const clouds = useMemo((): CloudData[] => {
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed * 9999) * 10000;
      return x - Math.floor(x);
    };

    return Array.from({ length: count }, (_, i) => {
      const seed = i * 12345;
      return {
        position: new THREE.Vector3(
          (seededRandom(seed) - 0.5) * 30, // X spread
          seededRandom(seed + 1) * 40 - 5, // Y spread (across world height)
          (seededRandom(seed + 2) - 0.5) * 20 - 8, // Z (behind islands)
        ),
        scale: 2 + seededRandom(seed + 3) * 4,
        speed: 0.1 + seededRandom(seed + 4) * 0.2,
        opacity: 0.3 + seededRandom(seed + 5) * 0.4,
      };
    });
  }, [count]);

  // Create cloud texture on client only (avoids SSR document access)
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Create radial gradient for soft cloud look
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)');
      gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.2)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }

    const texture = new THREE.CanvasTexture(canvas);
    setCloudTexture(texture);

    // Cleanup texture on unmount
    return () => {
      texture.dispose();
    };
  }, []);

  // Animate cloud drift
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Sprite) {
          const cloud = clouds[i];
          // Gentle horizontal drift
          child.position.x += Math.sin(state.clock.elapsedTime * 0.1 + i) * 0.001 * cloud.speed;
          // Subtle vertical bobbing
          child.position.y += Math.cos(state.clock.elapsedTime * 0.05 + i * 0.5) * 0.0005;
        }
      });
    }
  });

  // Don't render until texture is ready (client-side only)
  if (!cloudTexture) {
    return null;
  }

  return (
    <group ref={groupRef}>
      {clouds.map((cloud, index) => (
        <sprite
          key={index}
          position={cloud.position}
          scale={[cloud.scale * 1.5, cloud.scale, 1]}
        >
          <spriteMaterial
            map={cloudTexture}
            transparent
            opacity={cloud.opacity}
            depthWrite={false}
            color="#e0e8ff"
          />
        </sprite>
      ))}
    </group>
  );
}
