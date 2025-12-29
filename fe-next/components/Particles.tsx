import React, { useEffect, useState, memo } from 'react';
import { motion } from 'framer-motion';
import { useDevicePerformance } from '../hooks/useDevicePerformance';

interface Particle {
    id: number;
    initialX: number;
    initialY: number;
    targetX: number;
    targetY: number;
    duration: number;
    width: number;
    height: number;
}

/**
 * Particles - Decorative background particles
 *
 * PERFORMANCE: Disabled on low-end devices and when reduced motion is preferred.
 * Uses device performance hook to adapt particle count.
 */
const Particles: React.FC = memo(() => {
    const [particles, setParticles] = useState<Particle[]>([]);
    const { enableComplexAnimations, maxParticles, prefersReducedMotion } = useDevicePerformance();

    useEffect(() => {
        // Skip particles entirely on low-end devices or reduced motion preference
        if (!enableComplexAnimations || prefersReducedMotion || maxParticles === 0) {
            setParticles([]);
            return;
        }

        // Defer state update to avoid synchronous setState
        Promise.resolve().then(() => {
            // Use adaptive particle count based on device capability
            const particleCount = Math.min(maxParticles, 20);
            const newParticles: Particle[] = [...Array(particleCount)].map((_, i) => ({
                id: i,
                initialX: Math.random() * window.innerWidth,
                initialY: Math.random() * window.innerHeight,
                targetX: Math.random() * window.innerWidth,
                targetY: Math.random() * window.innerHeight,
                duration: Math.random() * 10 + 10,
                width: Math.random() * 10 + 5,
                height: Math.random() * 10 + 5,
            }));
            setParticles(newParticles);
        });
    }, [enableComplexAnimations, maxParticles, prefersReducedMotion]);

    if (particles.length === 0) return null;

    return (
        <>
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    initial={{
                        x: p.initialX,
                        y: p.initialY,
                    }}
                    animate={{
                        y: [null, p.targetY],
                        x: [null, p.targetX],
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        repeatType: 'reverse',
                    }}
                    className="absolute rounded-full bg-cyan-400/20"
                    style={{
                        width: p.width,
                        height: p.height,
                    }}
                />
            ))}
        </>
    );
});

Particles.displayName = 'Particles';

export default Particles;
