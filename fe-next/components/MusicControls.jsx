'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaVolumeUp, FaVolumeMute, FaVolumeDown } from 'react-icons/fa';
import { useMusic } from '../contexts/MusicContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

/**
 * MusicControls - Neo-Brutalist styled music volume control
 */
const MusicControls = () => {
    const { volume, setVolume, isMuted, toggleMute, isPlaying, audioUnlocked, unlockAudio } = useMusic();
    const { t } = useLanguage();
    const [showSlider, setShowSlider] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    // Prevent hydration mismatch by only rendering dynamic icon after mount
    useEffect(() => {
        setHasMounted(true);
    }, []);

    const getVolumeIcon = () => {
        // Return consistent icon during SSR to prevent hydration mismatch
        if (!hasMounted) return <FaVolumeUp size={18} />;

        if (isMuted || volume === 0) return <FaVolumeMute size={18} />;
        if (volume < 0.5) return <FaVolumeDown size={18} />;
        return <FaVolumeUp size={18} />;
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (isMuted && newVolume > 0) {
            toggleMute();
        }
    };

    const handleClick = () => {
        if (!audioUnlocked) {
            unlockAudio();
        } else {
            toggleMute();
        }
    };

    return (
        <div
            className="relative"
            onMouseEnter={() => setShowSlider(true)}
            onMouseLeave={() => setShowSlider(false)}
        >
            {/* Neo-Brutalist Volume Button */}
            <Button
                variant="outline"
                size="icon"
                onClick={handleClick}
                className="relative bg-neo-cream text-neo-black"
                aria-label={isMuted ? t('music.unmute') : t('music.mute')}
            >
                {getVolumeIcon()}

                {/* Playing indicator - Neo-Brutalist style */}
                {isPlaying && !isMuted && audioUnlocked && (
                    <motion.div
                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-neo-lime border-2 border-neo-black"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                )}
            </Button>

            {/* Neo-Brutalist Volume Slider Dropdown */}
            <AnimatePresence>
                {showSlider && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95, rotate: -2 }}
                        animate={{ opacity: 1, y: 0, scale: 1, rotate: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: [0.68, -0.55, 0.265, 1.55] }}
                        className="
                            absolute top-full right-0 mt-3 p-3
                            min-w-[150px]
                            bg-neo-cream text-neo-black
                            border-3 border-neo-black
                            rounded-neo
                            shadow-hard-lg
                            z-50
                        "
                    >
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-black uppercase tracking-wide text-neo-black/70">
                                {t('music.volume')}: {Math.round(volume * 100)}%
                            </span>

                            {/* Neo-Brutalist Range Slider */}
                            <div className="relative h-4 bg-neo-navy/20 border-2 border-neo-black rounded-neo overflow-hidden">
                                <div
                                    className="absolute inset-y-0 left-0 bg-neo-pink"
                                    style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                                />
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={isMuted ? 0 : volume}
                                    onChange={handleVolumeChange}
                                    dir="ltr"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                            </div>

                            {!audioUnlocked && (
                                <span className="text-xs font-bold text-neo-orange">
                                    {t('music.clickToEnable')}
                                </span>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MusicControls;
