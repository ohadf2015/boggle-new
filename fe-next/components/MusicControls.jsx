'use client';

import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaVolumeUp, FaVolumeMute, FaVolumeDown, FaMusic } from 'react-icons/fa';
import { HiSpeakerWave } from 'react-icons/hi2';
import { useMusic } from '../contexts/MusicContext';
import { useSoundEffects } from '../contexts/SoundEffectsContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

/**
 * MusicControls - Neo-Brutalist styled volume controls with separate music and SFX sliders
 * Memoized to prevent unnecessary re-renders
 */
const MusicControls = memo(() => {
    const { volume, setVolume, isMuted, toggleMute, isPlaying, audioUnlocked, unlockAudio } = useMusic();
    const { sfxVolume, setSfxVolume, sfxMuted, toggleSfxMute } = useSoundEffects();
    const { t } = useLanguage();
    const [showSlider, setShowSlider] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    // Prevent hydration mismatch by only rendering dynamic icon after mount
    useEffect(() => {
        setHasMounted(true);
    }, []);

    // Memoized volume icon
    const volumeIcon = useMemo(() => {
        // Return consistent icon during SSR to prevent hydration mismatch
        if (!hasMounted) return <FaVolumeUp size={18} aria-hidden="true" />;

        // Show muted if both are muted
        if ((isMuted || volume === 0) && (sfxMuted || sfxVolume === 0)) return <FaVolumeMute size={18} aria-hidden="true" />;
        // Show low volume if average is low
        const avgVolume = ((isMuted ? 0 : volume) + (sfxMuted ? 0 : sfxVolume)) / 2;
        if (avgVolume < 0.5) return <FaVolumeDown size={18} aria-hidden="true" />;
        return <FaVolumeUp size={18} aria-hidden="true" />;
    }, [hasMounted, isMuted, volume, sfxMuted, sfxVolume]);

    const handleMusicVolumeChange = useCallback((e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (isMuted && newVolume > 0) {
            toggleMute();
        }
    }, [setVolume, isMuted, toggleMute]);

    const handleSfxVolumeChange = useCallback((e) => {
        const newVolume = parseFloat(e.target.value);
        setSfxVolume(newVolume);
        if (sfxMuted && newVolume > 0) {
            toggleSfxMute();
        }
    }, [setSfxVolume, sfxMuted, toggleSfxMute]);

    const handleClick = useCallback(() => {
        if (!audioUnlocked) {
            unlockAudio();
        } else {
            toggleMute();
        }
    }, [audioUnlocked, unlockAudio, toggleMute]);

    const handleMouseEnter = useCallback(() => setShowSlider(true), []);
    const handleMouseLeave = useCallback(() => setShowSlider(false), []);

    return (
        <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            role="group"
            aria-label={t('music.controls') || 'Music controls'}
        >
            {/* Neo-Brutalist Volume Button */}
            <Button
                variant="outline"
                size="icon"
                onClick={handleClick}
                className="relative bg-neo-cream text-neo-black"
                aria-label={isMuted ? (t('music.unmute') || 'Unmute') : (t('music.mute') || 'Mute')}
                aria-pressed={!isMuted}
            >
                {volumeIcon}

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
                        <div className="flex flex-col gap-3">
                            {/* Music Volume */}
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <FaMusic size={12} className="text-neo-pink" aria-hidden="true" />
                                    <span className="text-xs font-black uppercase tracking-wide text-neo-black/70">
                                        {t('music.musicVolume')}: {Math.round(volume * 100)}%
                                    </span>
                                </div>
                                <div className="relative h-4 bg-neo-navy/20 border-2 border-neo-black rounded-neo overflow-hidden">
                                    <div
                                        className="absolute inset-y-0 left-0 bg-neo-pink"
                                        style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                                        aria-hidden="true"
                                    />
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={isMuted ? 0 : volume}
                                        onChange={handleMusicVolumeChange}
                                        dir="ltr"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        aria-label={t('music.musicVolumeSlider') || 'Music volume slider'}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={Math.round(volume * 100)}
                                    />
                                </div>
                            </div>

                            {/* Sound Effects Volume */}
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <HiSpeakerWave size={14} className="text-neo-lime" aria-hidden="true" />
                                    <span className="text-xs font-black uppercase tracking-wide text-neo-black/70">
                                        {t('music.sfxVolume')}: {Math.round(sfxVolume * 100)}%
                                    </span>
                                </div>
                                <div className="relative h-4 bg-neo-navy/20 border-2 border-neo-black rounded-neo overflow-hidden">
                                    <div
                                        className="absolute inset-y-0 left-0 bg-neo-lime"
                                        style={{ width: `${(sfxMuted ? 0 : sfxVolume) * 100}%` }}
                                        aria-hidden="true"
                                    />
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={sfxMuted ? 0 : sfxVolume}
                                        onChange={handleSfxVolumeChange}
                                        dir="ltr"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        aria-label={t('music.sfxVolumeSlider') || 'Sound effects volume slider'}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={Math.round(sfxVolume * 100)}
                                    />
                                </div>
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
});

MusicControls.displayName = 'MusicControls';

export default MusicControls;
