/**
 * ParentalConsentModal - Full consent form modal
 *
 * Displays a modal form for collecting parental consent including
 * parent email, child age, and consent checkbox. Follows WCAG 2.0 AA
 * accessibility requirements and neo-brutalist design system.
 *
 * @example
 * ```tsx
 * <ParentalConsentModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   onSuccess={() => {
 *     setShowModal(false);
 *     toast.success('Consent submitted!');
 *   }}
 * />
 * ```
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParentalConsent } from '@/hooks/useParentalConsent';

export interface ParentalConsentModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when consent is successfully submitted */
  onSuccess?: () => void;
}

interface FormErrors {
  email?: string;
  age?: string;
  terms?: string;
}

/**
 * ParentalConsentModal component
 *
 * A modal form for collecting parental consent for users under 14.
 * Required for GDPR/PPL compliance.
 */
export function ParentalConsentModal({
  isOpen,
  onClose,
  onSuccess,
}: ParentalConsentModalProps) {
  const { t } = useLanguage();
  const { submitConsent, loading } = useParentalConsent();

  // Form state
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ref for auto-focus
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus email input when modal opens
  useEffect(() => {
    if (isOpen && emailInputRef.current) {
      // Slight delay to ensure animation completes
      const timer = setTimeout(() => {
        emailInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen]);

  // Age options (5-17) - constant, no need for useMemo
  const ageOptions = Array.from({ length: 13 }, (_, i) => i + 5);

  // Helper functions - simple and don't need useCallback
  function calculateBirthYear(selectedAge: string): number {
    return new Date().getFullYear() - parseInt(selectedAge, 10);
  }

  function isValidEmail(emailValue: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  }

  // Validate form
  function validateForm(): boolean {
    const newErrors: FormErrors = {};

    if (!email || !isValidEmail(email)) {
      newErrors.email = t('consent.modal.error.invalidEmail');
    }

    if (!age) {
      newErrors.age = t('consent.modal.error.selectAge');
    }

    if (!termsAccepted) {
      newErrors.terms = t('consent.modal.error.acceptTerms');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // Handle form submission
  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await submitConsent({
        parentEmail: email,
        childBirthYear: calculateBirthYear(age),
      });

      if (success) {
        onSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle backdrop click - close modal when clicking outside
  function handleBackdropClick(e: React.MouseEvent): void {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neo-black/60 backdrop-blur-xs"
          />

          {/* Modal */}
          <m.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="consent-modal-title"
            className={cn(
              'relative z-10 w-full max-w-md mx-4',
              'bg-white',
              'border-4 border-neo-black rounded-neo',
              'shadow-hard-xl',
              'max-h-[90vh] overflow-y-auto'
            )}
          >
            {/* Header */}
            <div className={cn(
              'sticky top-0 z-10',
              'bg-linear-to-r from-neo-purple via-neo-indigo to-neo-purple',
              'text-white',
              'px-4 py-4 sm:px-6',
              'border-b-4 border-neo-black'
            )}>
              <div className="flex items-start gap-3">
                <div className={cn(
                  'shrink-0 w-10 h-10',
                  'bg-white/20',
                  'border-2 border-white/40 rounded-neo',
                  'flex items-center justify-center'
                )}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2
                    id="consent-modal-title"
                    className="font-black text-lg uppercase tracking-wide"
                  >
                    {t('consent.modal.title')}
                  </h2>
                  <p className="text-sm text-white mt-0.5">
                    {t('consent.modal.subtitle')}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className={cn(
                    'shrink-0 w-10 h-10',
                    'min-w-[44px] min-h-[44px]',
                    'flex items-center justify-center',
                    'bg-white/20 hover:bg-white/30',
                    'rounded-neo border-2 border-white/30',
                    'transition-colors',
                    'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2'
                  )}
                  aria-label={t('common.close')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
              {/* Intro text */}
              <p className="text-sm text-neo-gray-600">
                {t('consent.modal.intro')}
              </p>

              {/* Email field */}
              <div className="space-y-2">
                <label
                  htmlFor="parent-email"
                  className="block font-bold text-sm uppercase tracking-wide"
                >
                  {t('consent.parentEmail')}
                </label>
                <input
                  ref={emailInputRef}
                  id="parent-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className={cn(
                    'w-full px-4 py-3',
                    'border-3 border-neo-black rounded-neo',
                    'font-medium',
                    'focus:outline-hidden focus:ring-2 focus:ring-neo-purple focus:ring-offset-2',
                    errors.email && 'border-neo-red bg-neo-red/10'
                  )}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : 'email-hint'}
                />
                {errors.email ? (
                  <p id="email-error" className="text-sm text-neo-red font-medium" role="alert">
                    {errors.email}
                  </p>
                ) : (
                  <p id="email-hint" className="text-xs text-neo-gray-500">
                    {t('consent.parentEmailHint')}
                  </p>
                )}
              </div>

              {/* Age field */}
              <div className="space-y-2">
                <label
                  htmlFor="child-age"
                  className="block font-bold text-sm uppercase tracking-wide"
                >
                  {t('consent.childAge')}
                </label>
                <select
                  id="child-age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className={cn(
                    'w-full px-4 py-3',
                    'border-3 border-neo-black rounded-neo',
                    'font-medium',
                    'bg-white',
                    'focus:outline-hidden focus:ring-2 focus:ring-neo-purple focus:ring-offset-2',
                    errors.age && 'border-neo-red bg-neo-red/10'
                  )}
                  aria-invalid={!!errors.age}
                  aria-describedby={errors.age ? 'age-error' : 'age-hint'}
                >
                  <option value="">{t('consent.childAgeHint')}</option>
                  {ageOptions.map((ageValue) => (
                    <option key={ageValue} value={ageValue}>
                      {ageValue}
                    </option>
                  ))}
                </select>
                {errors.age && (
                  <p id="age-error" className="text-sm text-neo-red font-medium" role="alert">
                    {errors.age}
                  </p>
                )}
              </div>

              {/* Terms checkbox */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <input
                    id="consent-terms"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className={cn(
                      'mt-1 w-5 h-5',
                      'border-3 border-neo-black rounded',
                      'focus:outline-hidden focus:ring-2 focus:ring-neo-purple focus:ring-offset-2',
                      'accent-neo-purple'
                    )}
                    aria-invalid={!!errors.terms}
                    aria-describedby={errors.terms ? 'terms-error' : 'terms-hint'}
                  />
                  <label
                    htmlFor="consent-terms"
                    className="text-sm font-medium cursor-pointer"
                  >
                    {t('consent.agreeTerms')}
                  </label>
                </div>
                {errors.terms ? (
                  <p id="terms-error" className="text-sm text-neo-red font-medium ms-8" role="alert">
                    {errors.terms}
                  </p>
                ) : (
                  <p id="terms-hint" className="text-xs text-neo-gray-500 ms-8">
                    {t('consent.agreeTermsHint')}
                  </p>
                )}
              </div>

              {/* Links */}
              <div className="flex flex-wrap gap-4 text-sm">
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'inline-flex items-center gap-1',
                    'text-neo-purple hover:text-neo-indigo',
                    'font-medium underline underline-offset-2',
                    'focus:outline-hidden focus:ring-2 focus:ring-neo-purple'
                  )}
                >
                  {t('consent.privacyLink')}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'inline-flex items-center gap-1',
                    'text-neo-purple hover:text-neo-indigo',
                    'font-medium underline underline-offset-2',
                    'focus:outline-hidden focus:ring-2 focus:ring-neo-purple'
                  )}
                >
                  {t('consent.termsLink')}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className={cn(
                  'w-full px-6 py-4',
                  'border-3 border-neo-black rounded-neo',
                  'font-black text-base uppercase tracking-wide',
                  'transition-all duration-100',
                  'min-h-[52px]',
                  'bg-neo-lime text-neo-black',
                  'shadow-hard',
                  'hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg',
                  'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
                  'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-hard'
                )}
              >
                {isSubmitting || loading
                  ? t('consent.submitting')
                  : t('consent.submit')}
              </button>
            </form>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default ParentalConsentModal;
