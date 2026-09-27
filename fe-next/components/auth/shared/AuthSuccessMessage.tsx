'use client';

import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';

interface AuthSuccessMessageProps {
  message: string;
  className?: string;
}

/**
 * Success message display for auth modals
 */
export function AuthSuccessMessage({ message, className }: AuthSuccessMessageProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  if (!message) return null;

  return (
    <div className={cn(
      'p-4 rounded-xl text-center',
      isDarkMode ? 'bg-emerald-900/30 border border-emerald-500' : 'bg-emerald-100 border border-emerald-500',
      className
    )}>
      <p className={cn(
        'text-sm font-bold',
        isDarkMode ? 'text-emerald-300' : 'text-emerald-700'
      )}>{message}</p>
    </div>
  );
}

export default AuthSuccessMessage;
