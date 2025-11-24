import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GoRipplesAnimation = ({ onComplete }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Complete animation after 2 seconds
        const completeTimer = setTimeout(() => {
            setIsVisible(false);
            if (onComplete) onComplete();
        }, 2000);

        return () => {
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    // Create multiple ripple waves
    const ripples = [
        { delay: 0, scale: 8, duration: 1.5, opacity: 0.4 },
        { delay: 0.2, scale: 8, duration: 1.5, opacity: 0.3 },
        { delay: 0.4, scale: 8, duration: 1.5, opacity: 0.2 },
        { delay: 0.6, scale: 8, duration: 1.5, opacity: 0.15 },
    ];

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden bg-black/10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Ripple waves */}
                    {ripples.map((ripple, index) => (
                        <motion.div
                            key={index}
                            className="absolute rounded-full border-4 border-cyan-400"
                            style={{
                                width: '100px',
                                height: '100px',
                            }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                                scale: ripple.scale,
                                opacity: [0, ripple.opacity, 0],
                            }}
                            transition={{
                                delay: ripple.delay,
                                duration: ripple.duration,
                                ease: "easeOut"
                            }}
                        />
                    ))}

                    {/* GO text with scale animation */}
                    <motion.div
                        className="absolute z-10"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: [0, 1.2, 1],
                            opacity: [0, 1, 1, 0],
                        }}
                        transition={{
                            duration: 2,
                            times: [0, 0.3, 0.7, 1],
                            ease: "easeOut"
                        }}
                    >
                        <h1
                            className="text-8xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500"
                            style={{
                                filter: 'drop-shadow(0 0 30px rgba(6, 182, 212, 0.8)) drop-shadow(0 0 15px rgba(59, 130, 246, 0.6))',
                                WebkitTextStroke: '3px rgba(255, 255, 255, 0.4)'
                            }}
                        >
                            GO!
                        </h1>
                    </motion.div>

                    {/* Additional glow effect */}
                    <motion.div
                        className="absolute w-64 h-64 rounded-full bg-cyan-400/20 blur-3xl"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: [0, 3, 4],
                            opacity: [0, 0.6, 0],
                        }}
                        transition={{
                            duration: 1.5,
                            ease: "easeOut"
                        }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GoRipplesAnimation;
