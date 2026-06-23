'use client';

import React, { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Volume1, Music, Smartphone } from 'lucide-react';
import { useMusic } from '../contexts/MusicContext';
import { useSoundEffects } from '../contexts/SoundEffectsContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { useHapticsConfig } from '../contexts/HapticsContext';
import { resolveMasterMuteClick } from '@/lib/audio/masterMuteToggle';
import { Reveal } from '@/components/ui/Reveal';

/**
 * MusicControls - Neo-Brutalist styled volume controls with separate music and SFX sliders
 * Memoized to prevent unnecessary re-renders
 */
const MusicControls: React.FC = memo(() => {
  const { volume, setVolume, isMuted, toggleMute, isPlaying, audioUnlocked, unlockAudio } = useMusic();
  const { sfxVolume, setSfxVolume, sfxMuted, toggleSfxMute } = useSoundEffects();
  const { t, language } = useLanguage();
  const { enabled: hapticsEnabled, setEnabled: setHapticsEnabled } = useHapticsConfig();
  const [showSlider, setShowSlider] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isRTL = language === 'he';

  // Prevent hydration mismatch by only rendering dynamic icon after mount
  useEffect(() => {
    setHasMounted(true);
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
    setHapticsEnabled(newValue);
    // Give tactile feedback when enabling
    if (newValue && 'vibrate' in navigator) {
      navigator.vibrate(15);
    }
  }, [hapticsEnabled, setHapticsEnabled]);

  // Responsive icon class for consistent sizing with button
  const iconClass = "w-[18px] h-[18px]";

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

  // Volume sliders are pure volume controls. Mute is a separate axis the user
  // toggles via the master button — sliding the volume up while muted should
  // not unilaterally unmute. (Doing so caused mute to "come back" after every
  // tweak, since other surfaces also trigger volume changes.)
  const handleMusicVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  }, [setVolume]);

  const handleSfxVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSfxVolume(parseFloat(e.target.value));
  }, [setSfxVolume]);

  // Master mute: locked tab → unlock + move toward audible (never swallow the
  // click, never mute on the enable tap); unlocked → silence-wins coherent
  // toggle. See resolveMasterMuteClick for the full decision table.
  const handleClick = useCallback(() => {
    const action = resolveMasterMuteClick({ audioUnlocked, isMuted, sfxMuted });
    if (action.unlock) unlockAudio();
    if (action.toggleMusic) toggleMute();
    if (action.toggleSfx) toggleSfxMute();
  }, [audioUnlocked, unlockAudio, isMuted, sfxMuted, toggleMute, toggleSfxMute]);

  const handleMouseEnter = useCallback(() => setShowSlider(true), []);
  const handleMouseLeave = useCallback(() => setShowSlider(false), []);
  const handleFocus = useCallback(() => setShowSlider(true), []);
  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Only close if focus leaves the entire dropdown/button group
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement;
    if (!currentTarget.contains(relatedTarget)) {
      setShowSlider(false);
    }
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      role="group"
      aria-label={t('music.controls')}
    >
      {/* Neo-Brutalist Volume Button */}
      <Button
        ref={buttonRef}
        variant="outline"
        size="icon"
        onClick={handleClick}
        className={`relative flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] border-3 border-neo-black dark:border-slate-500 rounded-neo shadow-hard-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-hard active:translate-x-px active:translate-y-px active:shadow-none transition-all duration-100 shrink-0 ${hasMounted && (isMuted || volume === 0) && (sfxMuted || sfxVolume === 0) ? 'bg-slate-200 text-slate-400 dark:bg-slate-600 dark:text-slate-400' : 'bg-neo-cream dark:bg-neo-navy-elevated text-neo-black dark:text-white'}`}
        aria-label={hasMounted ? (isMuted ? (t('music.unmute')) : (t('music.mute'))) : (t('music.mute'))}
        aria-pressed={hasMounted ? !isMuted : true}
        title={hasMounted ? (isMuted ? (t('music.soundOff')) : (t('music.soundOn'))) : (t('music.sound'))}
      >
        {volumeIcon}

        {/* Playing indicator - Neo-Brutalist style */}
        {isPlaying && !isMuted && audioUnlocked && (
          <m.div
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-neo-lime text-neo-black border-2 border-neo-black"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ type: 'tween', repeat: Infinity, duration: 1.5 }}
          />
        )}
      </Button>

      {/* Neo-Brutalist Volume Slider Dropdown - Rendered via Portal to escape stacking contexts */}
      {hasMounted && createPortal(
        <AnimatePresence>
          {showSlider && (
            <Reveal
              noSlide
              className="
                fixed p-3
                min-w-[150px]
                bg-neo-cream text-neo-black
                border-3 border-neo-black
                rounded-neo
                shadow-hard-lg
                z-[70]
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
                      aria-label={t('music.musicVolumeSlider')}
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
                      aria-label={t('music.sfxVolumeSlider')}
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
                        {t('music.haptics')}
                      </span>
                    </div>
                    <button
                      onClick={handleToggleHaptics}
                      className="relative flex items-center"
                      style={{ width: '44px', height: '22px' }}
                      role="switch"
                      aria-checked={hapticsEnabled}
                      aria-label={t('music.toggleHaptics')}
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
                      <m.div
                        className="absolute rounded-full bg-neo-cream border-2 border-neo-black shadow-hard-sm"
                        style={{ width: '16px', height: '16px', top: '3px' }}
                        animate={{ left: hapticsEnabled ? '26px' : '2px' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                )}

                {!audioUnlocked && (
                  <span className="text-xs font-bold text-neo-white">
                    {t('music.clickToEnable')}
                  </span>
                )}
              </div>
            </Reveal>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
});

MusicControls.displayName = 'MusicControls';

export default MusicControls;
