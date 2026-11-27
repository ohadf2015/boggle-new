'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import { LandingPage } from '@/components/landing/kit';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBackOneLevel } from '@/hooks/useBackOneLevel';
import { cn } from '@/lib/utils';

interface LegalPageLayoutProps {
    children: React.ReactNode;
    title: string;
    lastUpdated?: string;
    /** Custom breadcrumb items. Defaults to Legal > title */
    breadcrumbs?: { label: string; href?: string }[];
}

export default function LegalPageLayout({
    children,
    title,
    lastUpdated = 'November 2025',
    breadcrumbs,
}: LegalPageLayoutProps): React.ReactElement {
  const { t, language } = useLanguage();
  const goBack = useBackOneLevel();

  const links = [
    { href: `/${language}/about`, label: t('legal.about.title') },
    { href: `/${language}/legal/terms`, label: t('legal.termsOfService') },
    { href: `/${language}/legal/privacy`, label: t('legal.privacyPolicy') },
    { href: `/${language}/legal/refund`, label: t('legal.refundPolicy') },
    { href: `/${language}/legal/cookies`, label: t('footer.cookiePolicy') },
    { href: `/${language}/legal/disclaimer`, label: t('legal.disclaimer.title') },
    { href: `/${language}/contact`, label: t('contact.title') },
  ];

  return (
    <div className="flex flex-1 flex-col bg-neo-navy">
      <Header />

      <LandingPage locale={language} topBar={false} className="gap-10 sm:gap-12">
        <header className="flex flex-col items-start gap-4 lg:pt-4">
          <Breadcrumbs
            items={breadcrumbs || [
              { label: t('legal.title'), href: `/${language}/legal` },
              { label: title },
            ]}
          />
          <h1 className="font-neo-display text-[2rem] font-bold leading-[1.1] text-balance sm:text-5xl">{title}</h1>
          <p className="rounded-full border-2 border-neo-black bg-neo-yellow px-3 py-1 text-xs font-bold text-neo-black shadow-hard-sm">
            {t('legal.lastUpdated')}: {lastUpdated}
          </p>
        </header>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-14">
          <div
            className={cn(
              'prose prose-invert max-w-3xl text-base',
              'prose-headings:font-neo-display prose-headings:font-bold prose-headings:mb-3 prose-headings:mt-8 first:prose-headings:mt-0',
              'prose-h2:text-2xl prose-p:leading-relaxed prose-p:mb-4 prose-ul:my-4 prose-li:my-1',
              'prose-headings:text-neo-white prose-p:text-neo-white/80 prose-li:text-neo-white/80 prose-a:text-neo-cyan',
            )}
          >
            {children}
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
            <nav className="rounded-neo-lg border-3 border-neo-black bg-neo-cream p-4 text-neo-black shadow-hard-xl">
              <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
                {links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="block rounded-neo px-3 py-2 text-sm font-bold hover:bg-neo-yellow focus-visible:outline-3 focus-visible:outline-neo-black"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <button
              type="button"
              onClick={goBack}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-neo-white/25 px-4 text-sm font-bold text-neo-white/85 hover:border-neo-white/60 hover:text-neo-white"
            >
              <ArrowLeft aria-hidden className="h-4 w-4 rtl:rotate-180" />
              {t('legal.backToGame')}
            </button>
          </aside>
        </div>

        <p className="text-center text-sm text-neo-white/60">
          {t('legal.copyright', { year: new Date().getFullYear() })}
        </p>
      </LandingPage>
    </div>
  );
}
