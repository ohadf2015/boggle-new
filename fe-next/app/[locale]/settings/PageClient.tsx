'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Sun, Moon, Volume2, VolumeX, Music, Bell, Eye, Sparkles, Zap, Languages, Monitor, MessageSquare, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AutoHideHeader from '@/components/AutoHideHeader';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { cn } from '@/lib/utils';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';

// Language options
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  children: React.ReactNode;
  isDarkMode: boolean;
}

function SettingRow({ icon, label, description, children, isDarkMode }: SettingRowProps) {
  return (
    <div className={cn(
      'flex items-center justify-between p-4 rounded-neo border-3 border-neo-black',
      isDarkMode ? 'bg-slate-800' : 'bg-white'
    )}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn(
          'w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center border-2 border-neo-black',
          isDarkMode ? 'bg-slate-700' : 'bg-neo-cream'
        )}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('font-bold', isDarkMode ? 'text-white' : 'text-neo-black')}>
            {label}
          </p>
          {description && (
            <p className={cn('text-xs truncate', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 ms-3">
        {children}
      </div>
    </div>
  );
}

interface ToggleButtonProps {
  isOn: boolean;
  onToggle: () => void;
  isDarkMode: boolean;
  label: string;
  onLabel?: string;
  offLabel?: string;
}

function ToggleButton({ isOn, onToggle, isDarkMode, label, onLabel = 'On', offLabel = 'Off' }: ToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={isOn}
      aria-label={`${label}: ${isOn ? onLabel : offLabel}`}
      className={cn(
        'relative w-16 h-11 min-h-[44px] rounded-full border-3 border-neo-black transition-colors',
        isOn
          ? 'bg-neo-lime'
          : isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
      )}
    >
      <div
        className={cn(
          "absolute top-1 start-1 w-8 h-8 bg-white rounded-full border-2 border-neo-black shadow-sm transition-transform duration-200",
          isOn ? "translate-x-[24px] rtl:-translate-x-[24px]" : "translate-x-0"
        )}
      />
    </button>
  );
}

interface VolumeSliderProps {
  value: number;
  onChange: (value: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isDarkMode: boolean;
  label: string;
  muteLabel?: string;
  unmuteLabel?: string;
}

function VolumeSlider({ value, onChange, isMuted, onToggleMute, isDarkMode, label, muteLabel = 'Mute', unmuteLabel = 'Unmute' }: VolumeSliderProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggleMute}
        aria-label={isMuted ? `${unmuteLabel} ${label}` : `${muteLabel} ${label}`}
        aria-pressed={isMuted}
        className={cn(
          'w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center border-2 border-neo-black transition-colors',
          isMuted
            ? 'bg-neo-red text-white'
            : isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-neo-cream text-neo-black'
        )}
      >
        {isMuted ? <VolumeX className="w-5 h-5" aria-hidden="true" /> : <Volume2 className="w-5 h-5" aria-hidden="true" />}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={isMuted ? 0 : value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={isMuted}
        aria-label={`${label} volume`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((isMuted ? 0 : value) * 100)}
        className={cn(
          'w-full sm:w-24 h-2 rounded-full appearance-none cursor-pointer',
          isMuted ? 'opacity-50' : '',
          isDarkMode ? 'bg-slate-600' : 'bg-gray-300',
          '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neo-lime [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-neo-black [&::-webkit-slider-thumb]:cursor-pointer'
        )}
      />
    </div>
  );
}

export default function SettingsPageClient(): React.JSX.Element {
  const { theme, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { volume: musicVolume, setVolume: setMusicVolume, isMuted: musicMuted, toggleMute: toggleMusicMute } = useMusic();
  const { sfxVolume, setSfxVolume, sfxMuted, toggleSfxMute } = useSoundEffects();
  const { settings, toggleFireRoundLights, toggleEarthquakeEffects, cycleReduceMotion } = useAccessibility();
  const router = useRouter();
  const isLandscape = useMobileLandscape();
  const isDarkMode = theme === 'dark';

  // Get reduce motion display text
  const getReduceMotionLabel = () => {
    if (settings.reduceMotion === 'system') return t('settings.system');
    if (settings.reduceMotion === true) return t('settings.on');
    return t('settings.off');
  };

  return (
    <div className={cn(
      'flex-1 flex flex-col min-h-screen',
      isDarkMode
        ? 'bg-neo-navy'
        : 'bg-gradient-to-br from-neo-cream via-white to-neo-cream'
    )}>
      <AutoHideHeader />

      <div className={cn(
        "max-w-2xl mx-auto px-4 page-content-safe",
        // Reduced padding: mobile 12px, desktop 16px (was 24px)
        isLandscape ? "py-2" : "py-3 sm:py-4"
      )}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          // Reduced margin: mobile 12px, sm 16px (was 24px)
          className="flex items-center gap-4 mb-3 sm:mb-4"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${language}`)}
            className={cn(
              'rounded-neo border-3 border-neo-black shadow-hard',
              isDarkMode ? 'bg-slate-800 text-white hover:bg-slate-700 hover:text-white' : 'bg-white text-neo-black hover:bg-neo-cream'
            )}
          >
            <ArrowLeft className="w-4 h-4 me-1 rtl:rotate-180" />
            {t('common.back')}
          </Button>
          <h1 className={cn(
            'text-2xl font-black uppercase',
            isDarkMode ? 'text-white' : 'text-neo-black'
          )}>
            {t('settings.title')}
          </h1>
        </motion.div>

        {/* Settings Sections */}
        {/* Reduced spacing: mobile 12px, sm 16px (was 24px) */}
        <div className="space-y-3 sm:space-y-4">
          {/* Appearance */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className={cn(
              'text-sm font-black uppercase mb-3 flex items-center gap-2',
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            )}>
              <Eye className="w-4 h-4" />
              {t('settings.appearance')}
            </h2>
            <div className="space-y-3">
              <SettingRow
                icon={isDarkMode ? <Moon className="w-5 h-5 text-neo-pink" /> : <Sun className="w-5 h-5 text-neo-lime" />}
                label={t('settings.theme')}
                description={isDarkMode ? t('settings.dark') : t('settings.light')}
                isDarkMode={isDarkMode}
              >
                <ToggleButton
                  isOn={isDarkMode}
                  onToggle={toggleTheme}
                  isDarkMode={isDarkMode}
                  label={t('settings.theme')}
                  onLabel={t('settings.dark')}
                  offLabel={t('settings.light')}
                />
              </SettingRow>

              <SettingRow
                icon={<Languages className="w-5 h-5 text-neo-cyan" />}
                label={t('settings.language')}
                isDarkMode={isDarkMode}
              >
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'en' | 'he' | 'sv' | 'ja' | 'es')}
                  className={cn(
                    'px-3 py-2 rounded-neo border-3 border-neo-black font-bold',
                    isDarkMode ? 'bg-slate-700 text-white' : 'bg-neo-cream text-neo-black'
                  )}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </SettingRow>
            </div>
          </motion.section>

          {/* Audio */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className={cn(
              'text-sm font-black uppercase mb-3 flex items-center gap-2',
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            )}>
              <Volume2 className="w-4 h-4" />
              {t('settings.audio')}
            </h2>
            <div className="space-y-3">
              <SettingRow
                icon={<Music className="w-5 h-5 text-neo-pink" />}
                label={t('settings.music')}
                isDarkMode={isDarkMode}
              >
                <VolumeSlider
                  value={musicVolume}
                  onChange={setMusicVolume}
                  isMuted={musicMuted}
                  onToggleMute={toggleMusicMute}
                  isDarkMode={isDarkMode}
                  label={t('settings.music')}
                  muteLabel={t('settings.mute')}
                  unmuteLabel={t('settings.unmute')}
                />
              </SettingRow>

              <SettingRow
                icon={<Bell className="w-5 h-5 text-neo-lime" />}
                label={t('settings.soundEffects')}
                isDarkMode={isDarkMode}
              >
                <VolumeSlider
                  value={sfxVolume}
                  onChange={setSfxVolume}
                  isMuted={sfxMuted}
                  onToggleMute={toggleSfxMute}
                  isDarkMode={isDarkMode}
                  label={t('settings.soundEffects')}
                  muteLabel={t('settings.mute')}
                  unmuteLabel={t('settings.unmute')}
                />
              </SettingRow>
            </div>
          </motion.section>

          {/* Accessibility */}
          <motion.section
            id="accessibility"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className={cn(
              'text-sm font-black uppercase mb-3 flex items-center gap-2',
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            )}>
              <Sparkles className="w-4 h-4" />
              {t('settings.accessibility')}
            </h2>
            <div className="space-y-3">
              <SettingRow
                icon={<Monitor className="w-5 h-5 text-neo-cyan" />}
                label={t('settings.reduceMotion')}
                description={t('settings.reduceMotionDescription')}
                isDarkMode={isDarkMode}
              >
                <button
                  onClick={cycleReduceMotion}
                  aria-label={`${t('settings.reduceMotion')}: ${getReduceMotionLabel()}`}
                  className={cn(
                    'px-4 py-2 rounded-neo border-3 border-neo-black font-bold min-w-[80px] text-center',
                    settings.reduceMotion === true
                      ? 'bg-neo-lime text-neo-black'
                      : settings.reduceMotion === 'system'
                        ? 'bg-neo-cyan text-neo-black'
                        : isDarkMode ? 'bg-slate-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                  )}
                >
                  {getReduceMotionLabel()}
                </button>
              </SettingRow>

              <SettingRow
                icon={<Zap className="w-5 h-5 text-neo-lime" />}
                label={t('settings.fireRoundLights')}
                description={t('settings.fireRoundLightsDescription')}
                isDarkMode={isDarkMode}
              >
                <ToggleButton
                  isOn={!settings.disableFireRoundLights}
                  onToggle={toggleFireRoundLights}
                  isDarkMode={isDarkMode}
                  label={t('settings.fireRoundLights')}
                  onLabel={t('settings.enabled')}
                  offLabel={t('settings.disabled')}
                />
              </SettingRow>

              <SettingRow
                icon={<Sparkles className="w-5 h-5 text-neo-pink" />}
                label={t('settings.earthquakeEffects')}
                description={t('settings.earthquakeEffectsDescription')}
                isDarkMode={isDarkMode}
              >
                <ToggleButton
                  isOn={!settings.disableEarthquakeEffects}
                  onToggle={toggleEarthquakeEffects}
                  isDarkMode={isDarkMode}
                  label={t('settings.earthquakeEffects')}
                  onLabel={t('settings.enabled')}
                  offLabel={t('settings.disabled')}
                />
              </SettingRow>
            </div>
          </motion.section>

          {/* Support & Feedback */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className={cn(
              'text-sm font-black uppercase mb-3 flex items-center gap-2',
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            )}>
              <MessageSquare className="w-4 h-4" />
              {t('settings.support')}
            </h2>
            <Link
              href={`/${language}/contact`}
              className={cn(
                'flex items-center justify-between p-4 rounded-neo border-3 border-neo-black transition-all hover:scale-[1.01]',
                isDarkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-neo-cream shadow-hard'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center border-2 border-neo-black bg-neo-cyan'
                )}>
                  <MessageSquare className="w-5 h-5 text-neo-black" />
                </div>
                <div>
                  <p className={cn('font-bold', isDarkMode ? 'text-white' : 'text-neo-black')}>
                    {t('contact.title')}
                  </p>
                  <p className={cn('text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                    {t('settings.contactDescription')}
                  </p>
                </div>
              </div>
              <ChevronRight className={cn('w-5 h-5 rtl:rotate-180', isDarkMode ? 'text-gray-400' : 'text-gray-500')} />
            </Link>
          </motion.section>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className={cn(
            // Reduced margin: 16px top, 8px padding (was 32px/16px)
            'mt-4 pt-2 border-t text-center',
            isDarkMode ? 'border-slate-700' : 'border-gray-200'
          )}
        >
          <p className={cn('text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-400')}>
            {t('settings.savedAutomatically')}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
