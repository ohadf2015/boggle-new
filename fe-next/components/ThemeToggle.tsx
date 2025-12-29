'use client';

import React, { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from './ui/button';

/**
 * ThemeToggle - Neo-Brutalist styled theme toggle button
 * Allows users to switch between light and dark modes
 */
const ThemeToggle: React.FC = memo(() => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return placeholder with same dimensions to prevent layout shift
    return (
      <Button
        variant="outline"
        size="icon"
        className="bg-neo-cream text-neo-black min-w-[44px] min-h-[44px] w-11 h-11 opacity-0"
        aria-hidden="true"
      >
        <Moon size={18} />
      </Button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="relative bg-neo-cream text-neo-black min-w-[44px] min-h-[44px] w-11 h-11 xs:w-12 xs:h-12 sm:w-11 sm:h-11"
      aria-label={isDark ? (t('settings.lightMode') || 'Switch to light mode') : (t('settings.darkMode') || 'Switch to dark mode')}
      aria-pressed={!isDark}
    >
      <motion.div
        initial={false}
        animate={{
          rotate: isDark ? 0 : 180,
          scale: isDark ? 1 : 0.8,
        }}
        transition={{ duration: 0.3, ease: [0.68, -0.55, 0.265, 1.55] }}
      >
        {isDark ? (
          <Moon size={18} aria-hidden="true" />
        ) : (
          <Sun size={18} aria-hidden="true" className="text-neo-orange" />
        )}
      </motion.div>
    </Button>
  );
});

ThemeToggle.displayName = 'ThemeToggle';

export default ThemeToggle;
