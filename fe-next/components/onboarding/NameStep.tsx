'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaUser, FaCheck, FaTimes } from 'react-icons/fa';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface NameStepProps {
  name: string;
  onNameChange: (name: string) => void;
}

/**
 * NameStep - Name input with validation
 * Users enter their display name (2-20 characters, letters + numbers + spaces)
 */
const NameStep: React.FC<NameStepProps> = ({ name, onNameChange }) => {
  const { t } = useLanguage();
  const [touched, setTouched] = useState(false);

  // Validation
  const minLength = 2;
  const maxLength = 20;
  const isValidFormat = /^[\p{L}\p{N}\s]+$/u.test(name) || name === '';
  const isValidLength = name.trim().length >= minLength && name.length <= maxLength;
  const isValid = isValidFormat && isValidLength;
  const showError = touched && name.length > 0 && !isValid;

  const getErrorMessage = () => {
    if (!isValidFormat) return t('onboarding.name.errorInvalid');
    if (name.trim().length < minLength) return t('onboarding.name.errorTooShort');
    if (name.length > maxLength) return t('onboarding.name.errorTooLong');
    return '';
  };

  return (
    <div className="flex flex-col items-center space-y-3 sm:space-y-5">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center space-y-1"
      >
        <h2 className="text-xl sm:text-2xl font-black text-neo-black uppercase">
          {t('onboarding.name.title')}
        </h2>
        <p className="text-xs sm:text-sm text-neo-black/70">
          {t('onboarding.name.subtitle')}
        </p>
      </motion.div>

      {/* Name input card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-md"
      >
        <div
          className={cn(
            'bg-neo-cream border-3 border-neo-black rounded-neo p-3 sm:p-5 shadow-hard-md',
            'transition-all',
            showError && 'border-neo-red shadow-hard-sm',
            isValid && name.length > 0 && 'border-neo-lime'
          )}
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-neo-yellow text-neo-black border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm shrink-0">
              <FaUser className="text-neo-black text-lg sm:text-xl" />
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setTouched(true);
                  onNameChange(e.target.value);
                }}
                onBlur={() => setTouched(true)}
                placeholder={t('onboarding.name.placeholder')}
                maxLength={maxLength}
                className={cn(
                  'w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-white border-3 border-neo-black rounded-neo',
                  'font-bold text-base sm:text-lg text-neo-black placeholder:text-neo-black/40',
                  'focus:outline-none focus:ring-3 focus:ring-neo-cyan',
                  'shadow-hard-sm transition-all',
                  'min-h-[40px] sm:min-h-[44px]',
                  showError && 'border-neo-red focus:ring-neo-red'
                )}
              />
            </div>

            {/* Validation indicator */}
            {name.length > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  'w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center shadow-hard-sm shrink-0',
                  isValid
                    ? 'bg-neo-lime border-neo-black'
                    : 'bg-neo-red border-neo-black'
                )}
              >
                {isValid ? (
                  <FaCheck className="text-neo-black text-sm sm:text-base" />
                ) : (
                  <FaTimes className="text-neo-white text-sm sm:text-base" />
                )}
              </motion.div>
            )}
          </div>

          {/* Character counter */}
          <div className="flex justify-between items-center text-[10px] sm:text-xs">
            <div
              className={cn(
                'font-medium',
                showError ? 'text-neo-red' : 'text-neo-black/60'
              )}
            >
              {showError ? getErrorMessage() : `${minLength}-${maxLength} ${t('onboarding.name.characterCount')}`}
            </div>
            <div
              className={cn(
                'font-bold',
                name.length > maxLength ? 'text-neo-red' : 'text-neo-black/60'
              )}
            >
              {name.length}/{maxLength}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Fun fact */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-neo-pink border-3 border-neo-black rounded-neo p-2.5 sm:p-3 shadow-hard-md max-w-md"
      >
        <p className="text-center text-xs sm:text-sm text-neo-black">
          <span className="font-black">💡 </span>{t('onboarding.name.proTip')} 😎
        </p>
      </motion.div>
    </div>
  );
};

export default NameStep;
