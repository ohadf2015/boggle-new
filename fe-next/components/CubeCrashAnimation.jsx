import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CubeCrashAnimation = ({ onComplete }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            if (onComplete) onComplete();
        }, 3500); // Total animation duration (increased from 2500)

        return () => clearTimeout(timer);
    }, [onComplete]);

    // Cube configuration
    const cubes = [
        // Left side cubes
        { id: 1, x: -1000, y: -500, rotate: 45, delay: 0, color: 'bg-cyan-500' },
        { id: 2, x: -1200, y: 0, rotate: -30, delay: 0.1, color: 'bg-purple-500' },
        { id: 3, x: -1000, y: 500, rotate: 60, delay: 0.2, color: 'bg-teal-500' },

        // Right side cubes
        { id: 4, x: 1000, y: -500, rotate: -45, delay: 0, color: 'bg-pink-500' },
        { id: 5, x: 1200, y: 0, rotate: 30, delay: 0.1, color: 'bg-indigo-500' },
        { id: 6, x: 1000, y: 500, rotate: -60, delay: 0.2, color: 'bg-blue-500' },

        // Top/Bottom
        { id: 7, x: 0, y: -1000, rotate: 180, delay: 0.15, color: 'bg-yellow-500' },
        { id: 8, x: 0, y: 1000, rotate: 0, delay: 0.15, color: 'bg-orange-500' },
    ];

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Background flash */}
                    <motion.div
                        className="absolute inset-0 bg-white dark:bg-slate-900"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.8, 0] }}
                        transition={{ duration: 0.6, delay: 1.2 }}
                    />

                    {/* Cubes */}
                    {cubes.map((cube) => (
                        <motion.div
                            key={cube.id}
                            className={`absolute w-16 h-16 sm:w-24 sm:h-24 rounded-xl shadow-2xl ${cube.color} border-2 border-white/30 backdrop-blur-sm`}
                            initial={{
                                x: cube.x,
                                y: cube.y,
                                opacity: 0,
                                scale: 0.5,
                                rotate: cube.rotate
                            }}
                            animate={{
                                x: 0,
                                y: 0,
                                opacity: [0, 1, 1, 0],
                                scale: [0.5, 1.2, 0],
                                rotate: [cube.rotate, cube.rotate + 360]
                            }}
                            transition={{
                                duration: 2,
                                delay: cube.delay * 1.5,
                                ease: "anticipate",
                                times: [0, 0.6, 0.8, 1]
                            }}
                        >
                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl sm:text-4xl opacity-80">
                                {['L', 'E', 'X', 'I', 'C', 'L', 'A', 'S'][cube.id - 1]}
                            </div>
                        </motion.div>
                    ))}

                    {/* Impact Shockwave */}
                    <motion.div
                        className="absolute w-full h-full border-4 border-cyan-400 rounded-full"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 2], opacity: [0.8, 0] }}
                        transition={{ delay: 1.2, duration: 1, ease: "easeOut" }}
                    />

                    {/* Center Explosion Text */}
                    <motion.div
                        className="absolute z-10"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 1.5, 20], opacity: [0, 1, 0] }}
                        transition={{ delay: 1.2, duration: 1 }}
                    >
                        <h1 className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]">
                            GO!
                        </h1>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CubeCrashAnimation;
