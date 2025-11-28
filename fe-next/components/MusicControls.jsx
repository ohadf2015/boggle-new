'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaVolumeUp, FaVolumeMute, FaVolumeDown } from 'react-icons/fa';
import { useMusic } from '../contexts/MusicContext';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

const MusicControls = () => {
    const { volume, setVolume, isMuted, toggleMute, isPlaying, audioUnlocked, unlockAudio } = useMusic();
    const { theme } = useTheme();
    const { t, dir } = useLanguage();
    const [showSlider, setShowSlider] = useState(false);
    const isDarkMode = theme === 'dark';
    const isRTL = dir === 'rtl';

    const getVolumeIcon = () => {
        if (isMuted || volume === 0) return <FaVolumeMute size={18} />;
        if (volume < 0.5) return <FaVolumeDown size={18} />;
        return <FaVolumeUp size={18} />;
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        // If adjusting volume while muted, unmute
        if (isMuted && newVolume > 0) {
            toggleMute();
        }
    };

    const handleClick = () => {
        if (!audioUnlocked) {
            // First click unlocks audio and starts playing
            unlockAudio();
        } else {
            // Subsequent clicks toggle mute
            toggleMute();
        }
    };

    return (
        <div
            className="relative"
            onMouseEnter={() => setShowSlider(true)}
            onMouseLeave={() => setShowSlider(false)}
        >
            <Button
                variant="outline"
                size="icon"
                onClick={handleClick}
                className={cn(
                    "rounded-full transition-all duration-300 relative",
                    isDarkMode
                        ? "bg-slate-800 text-purple-400 hover:bg-slate-700 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] border-slate-700"
                        : "bg-white text-purple-500 hover:bg-gray-50 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] border-gray-200"
                )}
                aria-label={isMuted ? t('music.unmute') : t('music.mute')}
            >
                {getVolumeIcon()}

                {/* Playing indicator */}
                {isPlaying && !isMuted && audioUnlocked && (
                    <motion.div
                        className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                )}
            </Button>

            {/* Volume Slider Dropdown */}
            <AnimatePresence>
                {showSlider && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                            "absolute top-full right-0 mt-2 p-3 rounded-lg shadow-xl z-50 min-w-[140px]",
                            isDarkMode
                                ? "bg-slate-800 border border-slate-700"
                                : "bg-white border border-gray-200"
                        )}
                    >
                        <div className="flex flex-col gap-2">
                            <span className={cn(
                                "text-xs font-medium",
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                            )}>
                                {t('music.volume')}: {Math.round(volume * 100)}%
                            </span>

                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                dir="ltr"
                                className={cn(
                                    "w-full h-2 rounded-lg appearance-none cursor-pointer",
                                    isDarkMode
                                        ? "bg-slate-600 accent-purple-500"
                                        : "bg-gray-200 accent-purple-500"
                                )}
                                style={{
                                    background: isDarkMode
                                        ? `linear-gradient(to right, #a855f7 0%, #a855f7 ${(isMuted ? 0 : volume) * 100}%, #475569 ${(isMuted ? 0 : volume) * 100}%, #475569 100%)`
                                        : `linear-gradient(to right, #a855f7 0%, #a855f7 ${(isMuted ? 0 : volume) * 100}%, #e5e7eb ${(isMuted ? 0 : volume) * 100}%, #e5e7eb 100%)`
                                }}
                            />

                            {!audioUnlocked && (
                                <span className={cn(
                                    "text-xs",
                                    isDarkMode ? "text-yellow-400" : "text-yellow-600"
                                )}>
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
