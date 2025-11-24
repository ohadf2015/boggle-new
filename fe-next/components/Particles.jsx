import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const Particles = () => {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        // Defer state update to avoid synchronous setState
        Promise.resolve().then(() => {
            const newParticles = [...Array(20)].map((_, i) => ({
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
    }, []);

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
};

export default Particles;
