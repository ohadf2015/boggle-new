'use client';

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { ArrowLeft, Send, Mail, MessageSquare, User, CheckCircle, AlertCircle } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { useRouter } from 'next/navigation';
import AutoHideHeader from '@/components/AutoHideHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { InstagramIcon } from '@/components/icons/SocialIcons';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactPageClient(): React.JSX.Element {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isDarkMode = theme === 'dark';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }

      setStatus('success');
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
    }
  };

  const isValid = formData.name.trim() && formData.email.trim() && formData.message.trim();

  return (
    <div className={cn(
      'flex-1 flex flex-col',
      isDarkMode
        ? 'bg-neo-navy'
        : 'bg-linear-to-br from-neo-cream via-white to-neo-cream'
    )}>
      <AutoHideHeader />

      <div className={cn(
        "max-w-2xl mx-auto px-4 page-content-safe",
        // Reduced padding: mobile 12px, desktop 16px (was 24px)
        "py-3 sm:py-4"
      )}>
        {/* Header */}
        <m.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          // Reduced margin: mobile 12px, sm 16px (was 24px)
          className="flex items-center gap-4 mb-3 sm:mb-4"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${language}`)}
            className={cn(
              'rounded-neo border-3 border-neo-black shadow-hard',
              isDarkMode ? 'bg-neo-navy-light text-white hover:bg-neo-navy-elevated hover:text-white' : 'bg-white text-neo-black hover:bg-neo-cream'
            )}
          >
            <ArrowLeft className="w-4 h-4 me-1 rtl:rotate-180" />
            {t('common.back')}
          </Button>
          <h1 className={cn(
            'text-2xl font-black uppercase',
            isDarkMode ? 'text-white' : 'text-neo-black'
          )}>
            {t('contact.title')}
          </h1>
        </m.div>

        {/* Social Links */}
        <m.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          // Reduced margin: mobile 16px, sm 20px (was 32px)
          className="mb-4 sm:mb-5"
        >
          <h2 className={cn(
            'text-sm font-black uppercase mb-3 flex items-center gap-2',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          )}>
            <MessageSquare className="w-4 h-4" />
            {t('contact.connectWithUs')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Instagram */}
            <a
              href="https://www.instagram.com/lexi.clash"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex items-center gap-3 p-4 rounded-neo border-3 border-neo-black transition-all hover:scale-[1.02]',
                isDarkMode
                  ? 'bg-neo-navy-light hover:bg-neo-navy-elevated'
                  : 'bg-white hover:bg-neo-cream shadow-hard hover:shadow-hard-lg'
              )}
            >
              <div className={cn(
                'w-12 h-12 rounded-lg flex items-center justify-center border-2 border-neo-black',
                'bg-linear-to-br from-purple-500 via-pink-500 to-orange-400'
              )}>
                <InstagramIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className={cn('font-bold', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  Instagram
                </p>
                <p className={cn('text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                  @lexi.clash
                </p>
              </div>
            </a>

            {/* Email */}
            <a
              href="mailto:lexiclash.game@gmail.com"
              className={cn(
                'flex items-center gap-3 p-4 rounded-neo border-3 border-neo-black transition-all hover:scale-[1.02]',
                isDarkMode
                  ? 'bg-neo-navy-light hover:bg-neo-navy-elevated'
                  : 'bg-white hover:bg-neo-cream shadow-hard hover:shadow-hard-lg'
              )}
            >
              <div className={cn(
                'w-12 h-12 rounded-lg flex items-center justify-center border-2 border-neo-black bg-neo-cyan'
              )}>
                <Mail className="w-6 h-6 text-neo-black" />
              </div>
              <div>
                <p className={cn('font-bold', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  {t('contact.emailLabel')}
                </p>
                <p className={cn('text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                  lexiclash.game@gmail.com
                </p>
              </div>
            </a>
          </div>
        </m.section>

        {/* Contact Form */}
        <m.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className={cn(
            'text-sm font-black uppercase mb-3 flex items-center gap-2',
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          )}>
            <Send className="w-4 h-4" />
            {t('contact.sendMessage')}
          </h2>

          {status === 'success' ? (
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'p-6 rounded-neo border-3 border-neo-black text-center',
                isDarkMode ? 'bg-neo-navy-light' : 'bg-white shadow-hard'
              )}
            >
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-neo-lime" />
              <h3 className={cn('text-lg font-bold mb-2', isDarkMode ? 'text-white' : 'text-neo-black')}>
                {t('contact.successTitle')}
              </h3>
              <p className={cn('text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                {t('contact.successMessage')}
              </p>
              <Button
                onClick={() => setStatus('idle')}
                className="mt-4 rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-bold shadow-hard hover:shadow-hard-lg"
              >
                {t('contact.sendAnother')}
              </Button>
            </m.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="name"
                  className={cn('text-sm font-bold flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}
                >
                  <User className="w-4 h-4" />
                  {t('contact.nameLabel')}
                  <span className="text-neo-red">*</span>
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t('contact.namePlaceholder')}
                  required
                  disabled={status === 'submitting'}
                />
              </div>

              {/* Email Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className={cn('text-sm font-bold flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}
                >
                  <Mail className="w-4 h-4" />
                  {t('contact.emailLabel')}
                  <span className="text-neo-red">*</span>
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('contact.emailPlaceholder')}
                  required
                  disabled={status === 'submitting'}
                />
              </div>

              {/* Message Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="message"
                  className={cn('text-sm font-bold flex items-center gap-2', isDarkMode ? 'text-white' : 'text-neo-black')}
                >
                  <MessageSquare className="w-4 h-4" />
                  {t('contact.messageLabel')}
                  <span className="text-neo-red">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder={t('contact.messagePlaceholder')}
                  required
                  disabled={status === 'submitting'}
                  rows={5}
                  className={cn(
                    'flex w-full px-4 py-3 text-sm font-medium resize-none',
                    'rounded-neo border-3 border-neo-black dark:border-slate-500',
                    'bg-neo-cream dark:bg-neo-navy-elevated text-slate-900 dark:text-white',
                    'shadow-[inset_2px_2px_0px_rgba(0,0,0,0.1)]',
                    'placeholder:text-slate-500 dark:placeholder:text-slate-400 placeholder:font-normal',
                    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
                    'focus:shadow-[inset_3px_3px_0px_rgba(0,0,0,0.15)]',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'transition-shadow duration-100'
                  )}
                />
              </div>

              {/* Error Message */}
              {status === 'error' && (
                <m.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-neo border-2 border-neo-red bg-neo-red/10 text-neo-red"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">{errorMessage || t('contact.errorMessage')}</p>
                </m.div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!isValid || status === 'submitting'}
                className={cn(
                  'w-full rounded-neo border-3 border-neo-black font-bold text-lg py-6',
                  'bg-neo-lime text-neo-black shadow-hard',
                  'hover:bg-neo-orange hover:shadow-hard-lg',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-hard',
                  'transition-all duration-150'
                )}
              >
                {status === 'submitting' ? (
                  <>
                    <Loader size="sm" />
                    <span className="ms-2">{t('contact.sending')}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 me-2" />
                    {t('contact.submit')}
                  </>
                )}
              </Button>
            </form>
          )}
        </m.section>

        {/* Footer Note */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={cn(
            // Reduced margin: 16px top, 8px padding (was 32px/16px)
            'mt-4 pt-2 border-t text-center',
            isDarkMode ? 'border-slate-700' : 'border-gray-200'
          )}
        >
          <p className={cn('text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-400')}>
            {t('contact.responseTime')}
          </p>
        </m.div>
      </div>
    </div>
  );
}
