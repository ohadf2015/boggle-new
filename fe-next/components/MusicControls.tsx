'use client';

import React, { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Volume1, Music, Smartphone } from 'lucide-react';
import { useMusic } from '../contexts/MusicContext';
import { useSoundEffects } from '../contexts/SoundEffectsContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { isHapticsEnabled, setHapticsEnabled } from '../utils/haptics';

/**
 * MusicControls - Neo-Brutalist styled volume controls with separate music and SFX sliders
 * Memoized to prevent unnecessary re-renders
 */
const MusicControls: React.FC = memo(() => {
  const { volume, setVolume, isMuted, toggleMute, isPlaying, audioUnlocked, unlockAudio } = useMusic();
  const { sfxVolume, setSfxVolume, sfxMuted, toggleSfxMute } = useSoundEffects();
  const { t, language } = useLanguage();
  const [showSlider, setShowSlider] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isRTL = language === 'he';

  // Prevent hydration mismatch by only rendering dynamic icon after mount
  useEffect(() => {
    setHasMounted(true);
    // Load haptics preference after mount
    setHapticsEnabledState(isHapticsEnabled());
  }, []);

  // Calculate dropdown position when showing
  useEffect(() => {
    if (showSlider && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 12, // 12px gap below button
        left: rect.left,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showSlider]);

  // Toggle haptics and persist
  const handleToggleHaptics = useCallback(() => {
    const newValue = !hapticsEnabled;
    setHapticsEnabledState(newValue);
    setHapticsEnabled(newValue);
    // Give tactile feedback when enabling
    if (newValue && 'vibrate' in navigator) {
      navigator.vibrate(15);
    }
  }, [hapticsEnabled]);

  // Responsive icon class for consistent sizing with button
  const iconClass = "w-5 h-5 lg:w-5 lg:h-5 xl:w-6 xl:h-6 2xl:w-6 2xl:h-6";

  // Memoized volume icon
  const volumeIcon = useMemo(() => {
    // Return consistent icon during SSR to prevent hydration mismatch
    if (!hasMounted) return <Volume2 className={iconClass} strokeWidth={2.5} aria-hidden="true" />;

    // Show muted if both are muted
    if ((isMuted || volume === 0) && (sfxMuted || sfxVolume === 0)) return <VolumeX className={iconClass} strokeWidth={2.5} aria-hidden="true" />;
    // Show low volume if average is low
    const avgVolume = ((isMuted ? 0 : volume) + (sfxMuted ? 0 : sfxVolume)) / 2;
    if (avgVolume < 0.5) return <Volume1 className={iconClass} strokeWidth={2.5} aria-hidden="true" />;
    return <Volume2 className={iconClass} strokeWidth={2.5} aria-hidden="true" />;
  }, [hasMounted, isMuted, volume, sfxMuted, sfxVolume]);

  const handleMusicVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (isMuted && newVolume > 0) {
      toggleMute();
    }
  }, [setVolume, isMuted, toggleMute]);

  const handleSfxVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
        ref={buttonRef}
        variant="outline"
        size="icon"
        onClick={handleClick}
        className="relative bg-neo-cream text-neo-black min-w-[44px] min-h-[44px] w-11 h-11 lg:w-12 lg:h-12 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14 border-3 lg:border-3 2xl:border-3 rounded-neo lg:rounded-neo shadow-hard lg:shadow-hard 2xl:shadow-hard-lg"
        aria-label={isMuted ? (t('music.unmute') || 'Unmute') : (t('music.mute') || 'Mute')}
        aria-pressed={!isMuted}
      >
        {volumeIcon}

        {/* Playing indicator - Neo-Brutalist style */}
        {isPlaying && !isMuted && audioUnlocked && (
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-neo-lime text-neo-black border-2 border-neo-black"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
      </Button>

      {/* Neo-Brutalist Volume Slider Dropdown - Rendered via Portal to escape stacking contexts */}
      {hasMounted && createPortal(
        <AnimatePresence>
          {showSlider && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95, rotate: -2 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: [0.68, -0.55, 0.265, 1.55] }}
              className="
                fixed p-3
                min-w-[150px]
                bg-neo-cream text-neo-black
                border-3 border-neo-black
                rounded-neo
                shadow-hard-lg
                z-[9999]
              "
              style={{
                top: dropdownPosition.top,
                ...(isRTL
                  ? { left: dropdownPosition.left }
                  : { right: dropdownPosition.right }
                ),
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex flex-col gap-3">
                {/* Music Volume */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Music size={14} strokeWidth={2.5} className="text-neo-black" aria-hidden="true" />
                    <span className="text-xs font-black uppercase tracking-wide text-neo-black/70">
                      {t('music.musicVolume')}: {Math.round(volume * 100)}%
                    </span>
                  </div>
                  <div className="relative h-4 bg-neo-navy/20 text-white border-2 border-neo-black rounded-neo overflow-hidden">
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
                    <Volume2 size={14} strokeWidth={2.5} className="text-neo-black" aria-hidden="true" />
                    <span className="text-xs font-black uppercase tracking-wide text-neo-black/70">
                      {t('music.sfxVolume')}: {Math.round(sfxVolume * 100)}%
                    </span>
                  </div>
                  <div className="relative h-4 bg-neo-navy/20 text-white border-2 border-neo-black rounded-neo overflow-hidden">
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

                {/* Haptic Feedback Toggle */}
                {hasMounted && 'vibrate' in navigator && (
                  <div className="flex items-center justify-start gap-2 pt-2 border-t border-neo-black/40">
                    <div className="flex items-center">
                      <Smartphone size={14} strokeWidth={2.5} className="text-neo-black" aria-hidden="true" />
                      <span className="text-xs font-black uppercase tracking-wide text-neo-black/70">
                        {t('music.haptics') || 'Haptics'}
                      </span>
                    </div>
                    <button
                      onClick={handleToggleHaptics}
                      className="relative flex items-center"
                      style={{ width: '44px', height: '22px' }}
                      role="switch"
                      aria-checked={hapticsEnabled}
                      aria-label={t('music.toggleHaptics') || 'Toggle haptic feedback'}
                    >
                      {/* Track - thin pill shape, neo-brutalist */}
                      <div
                        className={`
                          absolute inset-x-0 rounded-full border-2 border-neo-black transition-colors duration-200
                          ${hapticsEnabled ? 'bg-neo-cyan' : 'bg-neo-navy/20'}
                        `}
                        style={{ height: '10px', top: '6px' }}
                      />
                      {/* Knob - circular, neo-brutalist with shadow */}
                      <motion.div
                        className="absolute rounded-full bg-neo-cream border-2 border-neo-black shadow-[2px_2px_0_0_#000]"
                        style={{ width: '16px', height: '16px', top: '3px' }}
                        animate={{ left: hapticsEnabled ? '26px' : '2px' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                )}

                {!audioUnlocked && (
                  <span className="text-xs font-bold text-neo-orange">
                    {t('music.clickToEnable')}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
});

MusicControls.displayName = 'MusicControls';

export default MusicControls;
