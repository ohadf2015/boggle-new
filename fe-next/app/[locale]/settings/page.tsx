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
          'w-10 h-10 rounded-lg flex items-center justify-center border-2 border-neo-black',
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
  onLabel?: string;
  offLabel?: string;
}

function ToggleButton({ isOn, onToggle, isDarkMode, onLabel = 'On', offLabel = 'Off' }: ToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'relative w-16 h-9 rounded-full border-3 border-neo-black transition-colors',
        isOn
          ? 'bg-neo-lime'
          : isDarkMode ? 'bg-slate-600' : 'bg-gray-300'
      )}
    >
      <div
        className={cn(
          "absolute top-0.5 start-0.5 w-7 h-7 bg-white rounded-full border-2 border-neo-black shadow-sm transition-transform duration-200",
          isOn ? "translate-x-[26px] rtl:-translate-x-[26px]" : "translate-x-0"
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
}

function VolumeSlider({ value, onChange, isMuted, onToggleMute, isDarkMode }: VolumeSliderProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggleMute}
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center border-2 border-neo-black transition-colors',
          isMuted
            ? 'bg-neo-red text-white'
            : isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-neo-cream text-neo-black'
        )}
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={isMuted ? 0 : value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={isMuted}
        className={cn(
          'w-24 h-2 rounded-full appearance-none cursor-pointer',
          isMuted ? 'opacity-50' : '',
          isDarkMode ? 'bg-slate-600' : 'bg-gray-300',
          '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neo-yellow [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-neo-black [&::-webkit-slider-thumb]:cursor-pointer'
        )}
      />
    </div>
  );
}

export default function SettingsPage(): React.ReactNode {
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
    if (settings.reduceMotion === 'system') return t('settings.system') || 'System';
    if (settings.reduceMotion === true) return t('settings.on') || 'On';
    return t('settings.off') || 'Off';
  };

  return (
    <div className={cn(
      isLandscape ? 'h-screen overflow-y-auto' : 'min-h-screen',
      isDarkMode
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
        : 'bg-gradient-to-br from-neo-cream via-white to-neo-cream'
    )}>
      <AutoHideHeader />

      <div className={cn(
        "max-w-2xl mx-auto px-4",
        isLandscape ? "py-2" : "py-6"
      )}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${language}`)}
            className={cn(
              'rounded-neo border-3 border-neo-black shadow-hard',
              isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-neo-black'
            )}
          >
            <ArrowLeft className="w-4 h-4 me-1 rtl:rotate-180" />
            {t('common.back') || 'Back'}
          </Button>
          <h1 className={cn(
            'text-2xl font-black uppercase',
            isDarkMode ? 'text-white' : 'text-neo-black'
          )}>
            {t('settings.title') || 'Settings'}
          </h1>
        </motion.div>

        {/* Settings Sections */}
        <div className="space-y-6">
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
              {t('settings.appearance') || 'Appearance'}
            </h2>
            <div className="space-y-3">
              <SettingRow
                icon={isDarkMode ? <Moon className="w-5 h-5 text-neo-purple" /> : <Sun className="w-5 h-5 text-neo-yellow" />}
                label={t('settings.theme') || 'Theme'}
                description={isDarkMode ? t('settings.dark') || 'Dark' : t('settings.light') || 'Light'}
                isDarkMode={isDarkMode}
              >
                <ToggleButton
                  isOn={isDarkMode}
                  onToggle={toggleTheme}
                  isDarkMode={isDarkMode}
                />
              </SettingRow>

              <SettingRow
                icon={<Languages className="w-5 h-5 text-neo-cyan" />}
                label={t('settings.language') || 'Language'}
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
              {t('settings.audio') || 'Audio'}
            </h2>
            <div className="space-y-3">
              <SettingRow
                icon={<Music className="w-5 h-5 text-neo-pink" />}
                label={t('settings.music') || 'Music'}
                isDarkMode={isDarkMode}
              >
                <VolumeSlider
                  value={musicVolume}
                  onChange={setMusicVolume}
                  isMuted={musicMuted}
                  onToggleMute={toggleMusicMute}
                  isDarkMode={isDarkMode}
                />
              </SettingRow>

              <SettingRow
                icon={<Bell className="w-5 h-5 text-neo-orange" />}
                label={t('settings.soundEffects') || 'Sound Effects'}
                isDarkMode={isDarkMode}
              >
                <VolumeSlider
                  value={sfxVolume}
                  onChange={setSfxVolume}
                  isMuted={sfxMuted}
                  onToggleMute={toggleSfxMute}
                  isDarkMode={isDarkMode}
                />
              </SettingRow>
            </div>
          </motion.section>

          {/* Accessibility */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className={cn(
              'text-sm font-black uppercase mb-3 flex items-center gap-2',
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            )}>
              <Sparkles className="w-4 h-4" />
              {t('settings.accessibility') || 'Accessibility'}
            </h2>
            <div className="space-y-3">
              <SettingRow
                icon={<Monitor className="w-5 h-5 text-neo-cyan" />}
                label={t('settings.reduceMotion') || 'Reduce Motion'}
                description={t('settings.reduceMotionDescription') || 'Limit animations'}
                isDarkMode={isDarkMode}
              >
                <button
                  onClick={cycleReduceMotion}
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
                icon={<Zap className="w-5 h-5 text-neo-yellow" />}
                label={t('settings.fireRoundLights') || 'Fire Round Lights'}
                description={t('settings.fireRoundLightsDescription') || 'Rainbow glow effects'}
                isDarkMode={isDarkMode}
              >
                <ToggleButton
                  isOn={!settings.disableFireRoundLights}
                  onToggle={toggleFireRoundLights}
                  isDarkMode={isDarkMode}
                />
              </SettingRow>

              <SettingRow
                icon={<Sparkles className="w-5 h-5 text-neo-purple" />}
                label={t('settings.earthquakeEffects') || 'Earthquake Effects'}
                description={t('settings.earthquakeEffectsDescription') || 'Screen shake & particles'}
                isDarkMode={isDarkMode}
              >
                <ToggleButton
                  isOn={!settings.disableEarthquakeEffects}
                  onToggle={toggleEarthquakeEffects}
                  isDarkMode={isDarkMode}
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
              {t('settings.support') || 'Support & Feedback'}
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
                    {t('contact.title') || 'Contact Us'}
                  </p>
                  <p className={cn('text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                    {t('settings.contactDescription') || 'Questions, feedback, or just say hi!'}
                  </p>
                </div>
              </div>
              <ChevronRight className={cn('w-5 h-5', isDarkMode ? 'text-gray-400' : 'text-gray-500')} />
            </Link>
          </motion.section>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className={cn(
            'mt-8 pt-4 border-t text-center',
            isDarkMode ? 'border-slate-700' : 'border-gray-200'
          )}
        >
          <p className={cn('text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-400')}>
            {t('settings.savedAutomatically') || 'Settings are saved automatically'}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
