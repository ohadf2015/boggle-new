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

    // Neo-Brutalist ripple waves - solid borders, no fade
    const ripples = [
        { delay: 0, scale: 6, duration: 1.2 },
        { delay: 0.15, scale: 6, duration: 1.2 },
        { delay: 0.3, scale: 6, duration: 1.2 },
        { delay: 0.45, scale: 6, duration: 1.2 },
    ];

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Neo-Brutalist ripple waves - thick black borders */}
                    {ripples.map((ripple, index) => (
                        <motion.div
                            key={`ripple-${ripple.id || index}`}
                            className="absolute rounded-neo-lg border-4 border-neo-black"
                            style={{
                                width: '120px',
                                height: '120px',
                                backgroundColor: index % 2 === 0 ? 'var(--neo-yellow)' : 'var(--neo-cyan)',
                            }}
                            initial={{ scale: 0, opacity: 1, rotate: -10 }}
                            animate={{
                                scale: ripple.scale,
                                opacity: [1, 0.8, 0],
                                rotate: 10,
                            }}
                            transition={{
                                delay: ripple.delay,
                                duration: ripple.duration,
                                ease: [0.68, -0.55, 0.265, 1.55]
                            }}
                        />
                    ))}

                    {/* Neo-Brutalist GO text */}
                    <motion.div
                        className="absolute z-10"
                        initial={{ scale: 0, opacity: 0, rotate: -15 }}
                        animate={{
                            scale: [0, 1.3, 1],
                            opacity: [0, 1, 1, 0],
                            rotate: [-15, 5, 0],
                        }}
                        transition={{
                            duration: 2,
                            times: [0, 0.3, 0.7, 1],
                            ease: [0.68, -0.55, 0.265, 1.55]
                        }}
                    >
                        {/* Background shape for text */}
                        <div
                            className="relative bg-neo-yellow border-4 border-neo-black rounded-neo-lg shadow-hard-xl px-8 py-4"
                            style={{ transform: 'rotate(-2deg)' }}
                        >
                            <h1
                                className="text-8xl sm:text-9xl font-black text-neo-black uppercase"
                                style={{
                                    textShadow: '4px 4px 0px var(--neo-cyan)',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                GO!
                            </h1>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GoRipplesAnimation;
