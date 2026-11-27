'use client';

import React, { useState } from 'react';
import { ArrowLeft, Send, Mail, MessageSquare, User, CheckCircle, AlertCircle } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { useRouter } from 'next/navigation';
import AutoHideHeader from '@/components/AutoHideHeader';
import { LandingPage, landingButtonClass } from '@/components/landing/kit';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { InstagramIcon } from '@/components/icons/SocialIcons';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactPageClient({ children }: { children?: React.ReactNode }): React.JSX.Element {
  const { t, language } = useLanguage();
  const router = useRouter();

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

  const field = 'min-h-12 rounded-neo-lg border-3 border-neo-black bg-neo-white text-base text-neo-black dark:border-neo-black dark:bg-neo-white dark:text-neo-black placeholder:text-neo-black/45 focus-visible:ring-3 focus-visible:ring-neo-cyan';
  const label = 'flex items-center gap-2 text-sm font-bold';
  const contactCard = 'flex items-center gap-4 rounded-neo-lg border-3 border-neo-black p-4 text-neo-black shadow-hard-xl motion-safe:transition-transform motion-safe:hover:-translate-y-1';

  return (
    <div className="flex flex-1 flex-col bg-neo-navy">
      <AutoHideHeader />

      <LandingPage locale={language} topBar={false} className="max-w-5xl">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-12 lg:pt-6">
          <div className="flex flex-col gap-6">
            <button
              type="button"
              onClick={() => router.push(`/${language}`)}
              className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-full border-2 border-neo-white/25 px-4 text-sm font-bold text-neo-white/85 hover:border-neo-white/60 hover:text-neo-white"
            >
              <DirectionalIcon icon={ArrowLeft} className="h-4 w-4" />
              {t('common.back')}
            </button>
            <h1 className="font-neo-display text-[2rem] font-bold leading-[1.1] sm:text-5xl">{t('contact.title')}</h1>

            <section className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 font-neo-display text-xl font-bold">
                <MessageSquare aria-hidden className="h-5 w-5" />
                {t('contact.connectWithUs')}
              </h2>
              <a href="https://www.instagram.com/lexi.clash" target="_blank" rel="noopener noreferrer" className={cn(contactCard, 'bg-neo-pink')}>
                <span className="flex h-12 w-12 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-cream">
                  <InstagramIcon className="h-6 w-6 text-neo-black" />
                </span>
                <span>
                  <span className="block font-bold">Instagram</span>
                  <span className="block text-sm">@lexi.clash</span>
                </span>
              </a>
              <a href="mailto:lexiclash.game@gmail.com" className={cn(contactCard, 'bg-neo-cyan')}>
                <span className="flex h-12 w-12 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-cream">
                  <Mail aria-hidden className="h-6 w-6" />
                </span>
                <span>
                  <span className="block font-bold">{t('contact.emailLabel')}</span>
                  <span className="block text-sm">lexiclash.game@gmail.com</span>
                </span>
              </a>
            </section>
          </div>

          <section className="rounded-neo-lg border-3 border-neo-black bg-neo-cream p-5 text-neo-black shadow-hard-xl sm:p-7">
            <h2 className="mb-4 flex items-center gap-2 font-neo-display text-xl font-bold">
              <Send aria-hidden className="h-5 w-5" />
              {t('contact.sendMessage')}
            </h2>

            {status === 'success' ? (
              <div className="py-4 text-center">
                <CheckCircle aria-hidden className="mx-auto mb-3 h-12 w-12" />
                <h3 className="mb-2 text-lg font-bold">{t('contact.successTitle')}</h3>
                <p className="text-sm">{t('contact.successMessage')}</p>
                <button type="button" onClick={() => setStatus('idle')} className={cn(landingButtonClass('primary'), 'mt-4')}>
                  {t('contact.sendAnother')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="name" className={label}>
                    <User aria-hidden className="h-4 w-4" />
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
                    className={field}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className={label}>
                    <Mail aria-hidden className="h-4 w-4" />
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
                    className={field}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="message" className={label}>
                    <MessageSquare aria-hidden className="h-4 w-4" />
                    {t('contact.messageLabel')}
                    <span className="text-neo-red">*</span>
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder={t('contact.messagePlaceholder')}
                    required
                    disabled={status === 'submitting'}
                    rows={5}
                    className={cn(field, 'resize-none')}
                  />
                </div>

                {status === 'error' && (
                  <div className="flex items-center gap-2 rounded-neo border-3 border-neo-black bg-neo-pink p-3">
                    <AlertCircle aria-hidden className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-bold">{errorMessage || t('contact.errorMessage')}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!isValid || status === 'submitting'}
                  className={cn(
                    landingButtonClass('primary'),
                    'w-full disabled:cursor-not-allowed disabled:border-dashed disabled:bg-neo-navy/10 disabled:text-neo-black/65 disabled:shadow-none disabled:hover:translate-y-0',
                  )}
                >
                  {status === 'submitting' ? (
                    <>
                      <Loader size="sm" />
                      <span className="ms-2">{t('contact.sending')}</span>
                    </>
                  ) : (
                    <>
                      <Send aria-hidden className="h-5 w-5" />
                      {t('contact.submit')}
                    </>
                  )}
                </button>
              </form>
            )}
            <p className="mt-4 border-t-2 border-neo-black/15 pt-3 text-center text-xs text-neo-black/70">{t('contact.responseTime')}</p>
          </section>
        </div>
        {children}
      </LandingPage>
    </div>
  );
}
