'use client';

import { m } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface AuthModalCloseButtonProps {
  onClose: () => void;
  className?: string;
}

/**
 * Close button for auth modals
 */
export function AuthModalCloseButton({ onClose, className }: AuthModalCloseButtonProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className={cn('absolute top-4 inset-e-4', className)}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className={cn(
          'rounded-full w-8 h-8',
          isDarkMode ? 'hover:bg-neo-navy-elevated' : 'hover:bg-gray-100'
        )}
        aria-label={t('common.close')}
      >
        <X className="w-5 h-5" />
      </Button>
    </m.div>
  );
}

export default AuthModalCloseButton;
