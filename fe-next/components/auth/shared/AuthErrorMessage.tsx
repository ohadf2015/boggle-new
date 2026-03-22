'use client';

import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface AuthErrorMessageProps {
  message: string;
  className?: string;
}

/**
 * Error message display for auth modals
 */
export function AuthErrorMessage({ message, className }: AuthErrorMessageProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  if (!message) return null;

  return (
    <div className={cn(
      'p-3 rounded-lg text-sm flex items-center gap-2',
      isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700',
      className
    )}>
      <AlertCircle className="w-4 h-4 shrink-0" />
      {message}
    </div>
  );
}

export default AuthErrorMessage;
