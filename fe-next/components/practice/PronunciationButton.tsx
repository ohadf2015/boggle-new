'use client';

import { useState } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useLanguage } from '@/contexts/LanguageContext';

interface PronunciationButtonProps {
  /** Word to pronounce */
  word: string;
  /** Language code (e.g., 'en-US') */
  lang?: string;
  /** IPA pronunciation fallback (shown if voice unavailable) */
  ipaPronunciation?: string;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

export function PronunciationButton({
  word,
  lang = 'en-US',
  ipaPronunciation,
  size = 'md',
  className = '',
}: PronunciationButtonProps) {
  const { t } = useLanguage();
  const { speak, isSpeaking } = useSpeechSynthesis();
  const [showFallback, setShowFallback] = useState(false);

  const handleClick = async () => {
    const success: boolean = await speak(word, lang);

    // Show IPA fallback if voice unavailable
    if (!success && ipaPronunciation) {
      setShowFallback(true);
      setTimeout(() => setShowFallback(false), 3000);
    }
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={isSpeaking}
        className={`
          ${sizeClasses[size]}
          flex items-center justify-center
          bg-neo-cyan text-neo-navy
          border-neo border-black
          rounded-neo
          shadow-hard
          transition-all duration-150
          hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-hard-pressed
          active:translate-x-[4px] active:translate-y-[4px] active:shadow-none
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        aria-label={isSpeaking ? t('education.lesson.speaking') : t('education.lesson.pronounce')}
      >
        {isSpeaking ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
      </button>

      {/* IPA Fallback Tooltip */}
      {showFallback && ipaPronunciation && (
        <div
          className="
            absolute top-full mt-2 left-1/2 -translate-x-1/2
            px-3 py-2
            bg-neo-navy text-neo-white
            border-neo border-neo-yellow
            rounded-neo
            shadow-hard
            text-sm font-neo-body
            whitespace-nowrap
            z-10
            animate-neo-pop
          "
          role="tooltip"
        >
          <div className="text-xs text-neo-yellow mb-1">
            {t('education.lesson.pronunciationFallback')}
          </div>
          <div className="font-mono">{ipaPronunciation}</div>
        </div>
      )}
    </div>
  );
}
