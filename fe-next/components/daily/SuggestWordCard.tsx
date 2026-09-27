'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SuggestWordCardProps {
  language: string;
  playerId?: string | null;
  guestFingerprint?: string | null;
}

export const SuggestWordCard: React.FC<SuggestWordCardProps> = ({
  language,
  playerId = null,
  guestFingerprint = null,
}) => {
  const { t } = useLanguage();
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'duplicate' | 'tooMany' | 'error' | 'invalid'>('idle');

  // Determine valid word length based on language
  const getValidLength = () => {
    return language === 'ja' ? { min: 2, max: 4 } : { min: 5, max: 7 };
  };

  const validateWord = () => {
    const { min, max } = getValidLength();
    if (word.length < min || word.length > max) {
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    const { min, max } = getValidLength();

    // Client-side validation
    if (!word.trim()) {
      setStatus('invalid');
      return;
    }

    if (word.length < min || word.length > max) {
      setStatus('invalid');
      return;
    }

    setLoading(true);
    setStatus('idle');

    try {
      const response = await fetch('/api/daily-challenge/suggest-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          word: word.toLowerCase().trim(),
          playerId: playerId || undefined,
          guestFingerprint: guestFingerprint || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          if (data.error === 'invalid_length') {
            setStatus('invalid');
          } else {
            setStatus('error');
          }
        } else if (response.status === 429) {
          setStatus('tooMany');
        } else {
          setStatus('error');
        }
        return;
      }

      // Success: 200 OK
      if (data.ok) {
        setStatus(data.duplicate ? 'duplicate' : 'success');
        setWord('');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Failed to suggest word:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit();
    }
  };

  const { min, max } = getValidLength();
  const placeholderKey = language === 'ja'
    ? 'wordHunt.suggest.placeholder'
    : 'wordHunt.suggest.placeholder';

  const isRTL = language === 'he';

  return (
    <div className={`rounded-neo border-neo-thick border-black bg-neo-navy-light p-4 shadow-hard space-y-3 ${isRTL ? 'dir-rtl' : ''}`}>
      <h3 className="font-neo-display text-base font-black text-neo-lime">
        {t('wordHunt.suggest.title')}
      </h3>

      <div className="flex gap-2">
        <input
          type="text"
          value={word}
          onChange={(e) => {
            setWord(e.target.value);
            setStatus('idle');
          }}
          onKeyDown={handleKeyDown}
          disabled={loading || status === 'success'}
          placeholder={t('wordHunt.suggest.placeholder')}
          aria-label={t('wordHunt.suggest.placeholder')}
          maxLength={max}
          className={`flex-1 px-3 py-2 rounded-neo border-neo border-black bg-neo-cream text-neo-black font-neo-body text-sm placeholder-neo-navy/50 disabled:opacity-50 ${
            isRTL ? 'text-right' : 'text-left'
          } focus:outline-none focus:ring-2 focus:ring-neo-lime`}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || status === 'success'}
          aria-busy={loading}
          className="px-4 py-2 rounded-neo border-neo-thick border-black bg-neo-lime text-neo-black font-neo-display font-black text-sm shadow-hard disabled:opacity-50 hover:shadow-hard-lg active:shadow-hard-pressed transition-shadow"
        >
          {t('wordHunt.suggest.button')}
        </button>
      </div>

      {/* Status messages */}
      {status === 'success' && (
        <div className="text-sm text-neo-lime font-neo-body">
          ✓ {t('wordHunt.suggest.success')}
        </div>
      )}
      {status === 'duplicate' && (
        <div className="text-sm text-neo-cyan font-neo-body">
          ✓ {t('wordHunt.suggest.duplicate')}
        </div>
      )}
      {status === 'tooMany' && (
        <div className="text-sm text-neo-orange font-neo-body">
          ⚠️ {t('wordHunt.suggest.tooMany')}
        </div>
      )}
      {status === 'error' && (
        <div className="text-sm text-neo-red font-neo-body">
          ✗ {t('wordHunt.suggest.error')}
        </div>
      )}
      {status === 'invalid' && (
        <div className="text-sm text-neo-red font-neo-body">
          ✗ {t('wordHunt.suggest.invalid')}
        </div>
      )}
    </div>
  );
};
