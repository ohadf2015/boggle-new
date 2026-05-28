'use client';

import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { Eye, EyeOff, Volume2, VolumeX, Sparkles, Zap, Type, Contrast, Waves } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import Header from '@/components/Header';

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
        t('accessibility.fireRoundLights.description') ||
        'Turn off the rainbow glowing cells during fire rounds to reduce visual distractions.',
      enabled: settings.disableFireRoundLights,
      iconColor: 'text-neo-purple',
    },
    {
      id: 'earthquakeEffects',
      icon: Waves,
      title: t('accessibility.earthquakeEffects.title'),
      description:
        t('accessibility.earthquakeEffects.description') ||
        'Turn off intense earthquake animations including extreme shaking, 3D tumbling, motion blur, screen shake, and particle debris.',
      enabled: settings.disableEarthquakeEffects,
      iconColor: 'text-neo-red',
    },
    {
      id: 'reduceMotion',
      icon: Zap,
      title: t('accessibility.reduceMotion.title'),
      description:
        t('accessibility.reduceMotion.description') ||
        'Minimize animations and transitions for a calmer experience. Useful for vestibular disorders or motion sensitivity.',
      enabled: reduceMotion,
      iconColor: 'text-neo-cyan',
    },
    {
      id: 'disableSounds',
      icon: disableSounds ? VolumeX : Volume2,
      title: t('accessibility.disableSounds.title'),
      description:
        t('accessibility.disableSounds.description') ||
        'Turn off all sound effects. Music controls are still available in the header.',
      enabled: disableSounds,
      iconColor: 'text-neo-lime',
    },
    {
      id: 'highContrast',
      icon: Contrast,
      title: t('accessibility.highContrast.title'),
      description:
        t('accessibility.highContrast.description') ||
        'Increase border widths and color contrast for better visibility.',
      enabled: highContrast,
      iconColor: 'text-neo-white',
    },
    {
      id: 'largerText',
      icon: Type,
      title: t('accessibility.largerText.title'),
      description:
        t('accessibility.largerText.description') ||
        'Increase base font size by 125% for better readability.',
      enabled: largerText,
      iconColor: 'text-neo-orange',
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-neo-navy">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 page-content-safe">
        {/* Page Title */}
        <m.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-black text-neo-white mb-3 uppercase">
            {language === 'he' && '♿'}
            <span className="mx-2">{t('accessibility.title')}</span>
            {language !== 'he' && '♿'}
          </h1>
          <p className="text-neo-white text-lg opacity-90 max-w-2xl mx-auto">
            {t('accessibility.subtitle') ||
              'Customize your experience to meet your needs. These settings are saved locally.'}
          </p>
        </m.div>

        {/* Settings Cards */}
        <div className="space-y-4">
          {settingsConfig.map((setting, index) => (
            <m.div
              key={setting.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-neo-gray border-3 border-neo-black rounded-neo shadow-hard-lg p-5 md:p-6"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="p-3 bg-neo-cream text-neo-black border-2 border-neo-black rounded-neo">
                  <setting.icon size={28} className={setting.iconColor} />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="font-black text-neo-white text-xl mb-2">{setting.title}</h3>
                  <p className="text-neo-white opacity-80 text-sm md:text-base mb-4">
                    {setting.description}
                  </p>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggle(setting.id as never, !setting.enabled)}
                  className={`relative w-16 h-8 shrink-0 rounded-full border-3 border-neo-black transition-colors duration-200 ${
                    setting.enabled ? 'bg-neo-lime' : 'bg-neo-red'
                  }`}
                  aria-label={`${setting.enabled ? 'Disable' : 'Enable'} ${setting.title}`}
                  aria-pressed={setting.enabled}
                >
                  <m.div
                    initial={false}
                    animate={{ x: setting.enabled ? 32 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 left-0.5 w-6 h-6 bg-neo-black rounded-full border-2 border-neo-white"
                  >
                    {setting.enabled ? (
                      <Eye size={14} className="text-neo-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    ) : (
                      <EyeOff size={14} className="text-neo-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    )}
                  </m.div>
                </button>
              </div>
            </m.div>
          ))}
        </div>

        {/* Info Footer */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="mt-8 p-4 bg-neo-purple bg-opacity-20 border-2 border-neo-purple rounded-neo"
        >
          <p className="text-neo-white text-sm text-center">
            {t('accessibility.footer') ||
              'These settings are stored locally on your device. For additional system-level accessibility features, check your device settings.'}
          </p>
        </m.div>
      </div>
    </div>
  );
}
