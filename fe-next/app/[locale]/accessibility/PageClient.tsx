'use client';

import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { Eye, EyeOff, Volume2, VolumeX, Sparkles, Zap, Type, Contrast, Waves } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import Header from '@/components/Header';
import { LandingPage } from '@/components/landing/kit';

/**
 * Accessibility Settings Page
 *
 * Provides user-friendly controls for:
 * - Disable fire round lights (rainbow dance floor)
 * - Reduce motion/animations
 * - Disable sound effects
 * - High contrast mode
 * - Larger text size
 */
export default function AccessibilitySettingsPageClient() {
  const { t, language } = useLanguage();
  const { settings, updateSetting } = useAccessibility();

  // Local state for accessibility preferences
  const [reduceMotion, setReduceMotion] = useState(false);
  const [disableSounds, setDisableSounds] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largerText, setLargerText] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const preferences = {
      reduceMotion: localStorage.getItem('a11y_reduce_motion') === 'true',
      disableSounds: localStorage.getItem('a11y_disable_sounds') === 'true',
      highContrast: localStorage.getItem('a11y_high_contrast') === 'true',
      largerText: localStorage.getItem('a11y_larger_text') === 'true',
    };

    setReduceMotion(preferences.reduceMotion);
    setDisableSounds(preferences.disableSounds);
    setHighContrast(preferences.highContrast);
    setLargerText(preferences.largerText);

    // Apply preferences to document
    if (preferences.reduceMotion) {
      document.documentElement.classList.add('reduce-motion');
    }
    if (preferences.highContrast) {
      document.documentElement.classList.add('high-contrast');
    }
    if (preferences.largerText) {
      document.documentElement.classList.add('larger-text');
    }
  }, []);

  // Handle toggle changes
  const handleToggle = (
    setting: 'reduceMotion' | 'disableSounds' | 'highContrast' | 'largerText' | 'fireRoundLights' | 'earthquakeEffects',
    value: boolean
  ) => {
    switch (setting) {
      case 'reduceMotion':
        setReduceMotion(value);
        localStorage.setItem('a11y_reduce_motion', value.toString());
        document.documentElement.classList.toggle('reduce-motion', value);
        break;
      case 'disableSounds':
        setDisableSounds(value);
        localStorage.setItem('a11y_disable_sounds', value.toString());
        break;
      case 'highContrast':
        setHighContrast(value);
        localStorage.setItem('a11y_high_contrast', value.toString());
        document.documentElement.classList.toggle('high-contrast', value);
        break;
      case 'largerText':
        setLargerText(value);
        localStorage.setItem('a11y_larger_text', value.toString());
        document.documentElement.classList.toggle('larger-text', value);
        break;
      case 'fireRoundLights':
        updateSetting('disableFireRoundLights', value);
        break;
      case 'earthquakeEffects':
        updateSetting('disableEarthquakeEffects', value);
        break;
    }
  };

  const settingsConfig = [
    {
      id: 'fireRoundLights',
      icon: Sparkles,
      title: t('accessibility.fireRoundLights.title'),
      description:
        t('accessibility.fireRoundLights.description', 'Turn off the rainbow glowing cells during fire rounds to reduce visual distractions.'),
      enabled: settings.disableFireRoundLights,
      iconColor: 'text-neo-pink',
    },
    {
      id: 'earthquakeEffects',
      icon: Waves,
      title: t('accessibility.earthquakeEffects.title'),
      description:
        t('accessibility.earthquakeEffects.description', 'Turn off intense earthquake animations including extreme shaking, 3D tumbling, motion blur, screen shake, and particle debris.'),
      enabled: settings.disableEarthquakeEffects,
      iconColor: 'text-neo-red',
    },
    {
      id: 'reduceMotion',
      icon: Zap,
      title: t('accessibility.reduceMotion.title'),
      description:
        t('accessibility.reduceMotion.description', 'Minimize animations and transitions for a calmer experience. Useful for vestibular disorders or motion sensitivity.'),
      enabled: reduceMotion,
      iconColor: 'text-neo-cyan',
    },
    {
      id: 'disableSounds',
      icon: disableSounds ? VolumeX : Volume2,
      title: t('accessibility.disableSounds.title'),
      description:
        t('accessibility.disableSounds.description', 'Turn off all sound effects. Music controls are still available in the header.'),
      enabled: disableSounds,
      iconColor: 'text-neo-lime',
    },
    {
      id: 'highContrast',
      icon: Contrast,
      title: t('accessibility.highContrast.title'),
      description:
        t('accessibility.highContrast.description', 'Increase border widths and color contrast for better visibility.'),
      enabled: highContrast,
      iconColor: 'text-neo-white',
    },
    {
      id: 'largerText',
      icon: Type,
      title: t('accessibility.largerText.title'),
      description:
        t('accessibility.largerText.description', 'Increase base font size by 125% for better readability.'),
      enabled: largerText,
      iconColor: 'text-neo-orange',
    },
  ];

  return (
    <div className="flex flex-1 flex-col bg-neo-navy">
      <Header />
      <LandingPage locale={language} topBar={false} className="max-w-4xl gap-10 sm:gap-12">
        <header className="flex flex-col gap-4 lg:pt-6">
          <h1 className="font-neo-display text-[2rem] font-bold leading-[1.1] sm:text-5xl">
            {language === 'he' && '♿'}
            <span className="mx-2">{t('accessibility.title')}</span>
            {language !== 'he' && '♿'}
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-neo-white/85">
            {t('accessibility.subtitle', 'Customize your experience to meet your needs. These settings are saved locally.')}
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {settingsConfig.map((setting) => (
            <div
              key={setting.id}
              className="flex items-start gap-4 rounded-neo-lg border-3 border-neo-black bg-neo-cream p-5 text-neo-black shadow-hard-xl"
            >
              <span className="rounded-neo border-2 border-neo-black bg-neo-navy p-2.5">
                <setting.icon size={26} className={setting.iconColor} />
              </span>
              <div className="flex-1">
                <h3 className="mb-1 font-neo-display text-xl font-bold">{setting.title}</h3>
                <p className="text-[15px] leading-relaxed">{setting.description}</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(setting.id as never, !setting.enabled)}
                className={`relative h-8 w-16 shrink-0 rounded-full border-3 border-neo-black transition-colors duration-200 ${
                  setting.enabled ? 'bg-neo-lime' : 'bg-neo-navy/20'
                }`}
                aria-label={`${setting.enabled ? 'Disable' : 'Enable'} ${setting.title}`}
                aria-pressed={setting.enabled}
              >
                <m.div
                  initial={false}
                  animate={{ x: setting.enabled ? 32 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full border-2 border-neo-white bg-neo-black"
                >
                  {setting.enabled ? (
                    <Eye size={14} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-neo-white" />
                  ) : (
                    <EyeOff size={14} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-neo-white" />
                  )}
                </m.div>
              </button>
            </div>
          ))}
        </div>

        <p className="max-w-2xl text-sm leading-relaxed text-neo-white/75">
          {t('accessibility.footer', 'These settings are stored locally on your device. For additional system-level accessibility features, check your device settings.')}
        </p>
      </LandingPage>
    </div>
  );
}
