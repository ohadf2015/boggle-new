import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CubeCrashAnimation = ({ onComplete }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [phase, setPhase] = useState('cubes'); // 'cubes', 'shockwave', 'text'

    useEffect(() => {
        // Phase 1: Cubes crash (1.2s)
        const phaseTimer1 = setTimeout(() => setPhase('shockwave'), 1200);

        // Phase 2: Shockwave (0.5s)
        const phaseTimer2 = setTimeout(() => setPhase('text'), 1700);

        // Phase 3: Text explosion (0.8s)
        const completeTimer = setTimeout(() => {
            setIsVisible(false);
            if (onComplete) onComplete();
        }, 2500); // Reduced from 3500ms

        return () => {
            clearTimeout(phaseTimer1);
            clearTimeout(phaseTimer2);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    // Optimized cube configuration - reduced from 8 to 4 cubes
    const cubes = [
        { id: 1, x: -800, y: -400, rotate: 45, delay: 0, color: 'from-cyan-500 to-blue-600', letter: 'L' },
        { id: 2, x: 800, y: -400, rotate: -45, delay: 0.05, color: 'from-purple-500 to-pink-600', letter: 'E' },
        { id: 3, x: -800, y: 400, rotate: -60, delay: 0.1, color: 'from-teal-500 to-cyan-600', letter: 'X' },
        { id: 4, x: 800, y: 400, rotate: 60, delay: 0.15, color: 'from-orange-500 to-red-600', letter: 'I' },
    ];

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden"
                    style={{ willChange: 'opacity' }}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Optimized background gradient flash */}
                    {phase === 'shockwave' && (
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-br from-cyan-400/30 via-purple-500/30 to-pink-500/30"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 0.5 }}
                        />
                    )}

                    {/* Cubes - Only render in first phase */}
                    {phase === 'cubes' && cubes.map((cube) => (
                        <motion.div
                            key={cube.id}
                            className={`absolute w-20 h-20 sm:w-28 sm:h-28 rounded-2xl shadow-2xl bg-gradient-to-br ${cube.color} border-2 border-white/50`}
                            style={{ willChange: 'transform, opacity' }}
                            initial={{
                                x: cube.x,
                                y: cube.y,
                                opacity: 0,
                                scale: 0.3,
                                rotateZ: cube.rotate
                            }}
                            animate={{
                                x: 0,
                                y: 0,
                                opacity: [0, 1, 1, 0],
                                scale: [0.3, 1.1, 0],
                                rotateZ: [cube.rotate, cube.rotate + 180]
                            }}
                            transition={{
                                duration: 1.2,
                                delay: cube.delay,
                                ease: [0.34, 1.56, 0.64, 1], // Custom bounce easing
                                times: [0, 0.5, 0.9, 1]
                            }}
                        >
                            <div className="w-full h-full flex items-center justify-center">
                                <span className="text-white font-black text-3xl sm:text-5xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                                    {cube.letter}
                                </span>
                            </div>
                        </motion.div>
                    ))}

                    {/* Multiple shockwave rings for cooler effect */}
                    {phase === 'shockwave' && (
                        <>
                            {[0, 0.15, 0.3].map((delay, index) => (
                                <motion.div
                                    key={`shockwave-${delay}`}
                                    className="absolute w-32 h-32 border-4 border-cyan-400 rounded-full"
                                    style={{ willChange: 'transform, opacity' }}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{
                                        scale: [0, 3, 6],
                                        opacity: [0.8, 0.4, 0],
                                        borderWidth: ['4px', '2px', '1px']
                                    }}
                                    transition={{
                                        delay: delay,
                                        duration: 0.6,
                                        ease: "easeOut"
                                    }}
                                />
                            ))}
                        </>
                    )}

                    {/* Particle burst effect */}
                    {phase === 'shockwave' && (
                        <>
                            {[...Array(12)].map((_, i) => {
                                const angle = (i * 30) * (Math.PI / 180);
                                const distance = 200;
                                return (
                                    <motion.div
                                        key={`particle-${i}`}
                                        className="absolute w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500"
                                        style={{ willChange: 'transform, opacity' }}
                                        initial={{
                                            x: 0,
                                            y: 0,
                                            opacity: 1,
                                            scale: 1
                                        }}
                                        animate={{
                                            x: Math.cos(angle) * distance,
                                            y: Math.sin(angle) * distance,
                                            opacity: 0,
                                            scale: 0
                                        }}
                                        transition={{
                                            duration: 0.5,
                                            ease: "easeOut"
                                        }}
                                    />
                                );
                            })}
                        </>
                    )}

                    {/* Center Explosion Text with enhanced glow */}
                    {phase === 'text' && (
                        <motion.div
                            className="absolute z-10"
                            style={{ willChange: 'transform, opacity' }}
                            initial={{ scale: 0, opacity: 0, rotateZ: -20 }}
                            animate={{
                                scale: [0, 1.2, 15],
                                opacity: [0, 1, 0],
                                rotateZ: [-20, 0, 10]
                            }}
                            transition={{
                                duration: 0.8,
                                ease: [0.34, 1.56, 0.64, 1]
                            }}
                        >
                            <h1 className="text-7xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500"
                                style={{
                                    filter: 'drop-shadow(0 0 40px rgba(6, 182, 212, 0.8)) drop-shadow(0 0 20px rgba(168, 85, 247, 0.8))',
                                    WebkitTextStroke: '2px rgba(255, 255, 255, 0.3)'
                                }}>
                                GO!
                            </h1>
                        </motion.div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CubeCrashAnimation;
