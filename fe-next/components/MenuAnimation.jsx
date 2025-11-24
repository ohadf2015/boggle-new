import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { hebrewLetters, englishLetters, swedishLetters, japaneseLetters } from '../utils/consts';

/**
 * MenuAnimation - Flying letters animation for the menu/join view
 * Displays random letters floating around the screen with enhanced visibility and effects
 * ALWAYS VISIBLE regardless of language
 */
const MenuAnimation = ({ className = '' }) => {
    const { language } = useLanguage();
    const [letters, setLetters] = useState([]);

    // Generate random letters - always show regardless of language
    useEffect(() => {
        let letterSet;
        switch (language) {
            case 'he':
                letterSet = hebrewLetters;
                break;
            case 'sv':
                letterSet = swedishLetters;
                break;
            case 'ja':
                letterSet = japaneseLetters;
                break;
            case 'en':
            default:
                letterSet = englishLetters;
                break;
        }
        const numberOfLetters = 20;

        const newLetters = Array(numberOfLetters).fill(null).map((_, index) => ({
            id: `letter-${index}`,
            char: letterSet[Math.floor(Math.random() * letterSet.length)],
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
            size: Math.random() * 30 + 30, // 30-60px
            duration: Math.random() * 20 + 15,
            delay: Math.random() * 5,
            color: ['#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'][Math.floor(Math.random() * 5)],
        }));

        setLetters(newLetters);
    }, [language]);

    return (
        <div
            className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}
            style={{
                zIndex: 0,
                direction: 'ltr' // Force LTR to prevent RTL interference with positioning
            }}
        >
            <AnimatePresence mode="wait">
                {letters.map((letter) => {
                    return (
                        <motion.div
                            key={letter.id}
                            initial={{
                                x: letter.x,
                                y: letter.y,
                                opacity: 0,
                                scale: 0,
                            }}
                            animate={{
                                x: [
                                    letter.x,
                                    Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                                    Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                                ],
                                y: [
                                    letter.y,
                                    Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
                                    Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
                                ],
                                opacity: [0, 0.3, 0.4, 0.3, 0],
                                scale: [0, 1, 1.1, 1, 0.8],
                                rotate: [0, 180, 360, 540, 720],
                            }}
                            exit={{
                                opacity: 0,
                                scale: 0,
                            }}
                            transition={{
                                duration: letter.duration,
                                delay: letter.delay,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                            className="absolute font-bold"
                            style={{
                                fontSize: `${letter.size}px`,
                                fontFamily: (() => {
                                    switch (language) {
                                        case 'he':
                                            return "'Rubik', sans-serif";
                                        case 'ja':
                                            return "'Noto Sans JP', sans-serif";
                                        case 'sv':
                                        case 'en':
                                        default:
                                            return "'Inter', sans-serif";
                                    }
                                })(),
                                color: letter.color,
                                textShadow: `
                                    0 0 8px ${letter.color}66,
                                    0 0 16px ${letter.color}44,
                                    0 0 24px ${letter.color}22,
                                    2px 2px 4px rgba(0, 0, 0, 0.2)
                                `,
                                filter: 'brightness(1.2) saturate(1.2)',
                                fontWeight: 700,
                                letterSpacing: '0.05em',
                                WebkitFontSmoothing: 'antialiased',
                                MozOsxFontSmoothing: 'grayscale',
                                direction: 'ltr', // Force LTR for each letter
                                position: 'absolute'
                            }}
                        >
                            {letter.char}
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export default MenuAnimation;
