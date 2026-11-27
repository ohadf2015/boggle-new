'use client';

import PermanentEgg from '@/components/holidays/eggs/PermanentEgg';
import HolidaySeasonLink from '@/components/holidays/landing/HolidaySeasonLink';
import React from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { InstagramIcon } from '@/components/icons/SocialIcons';
import { ManageCookiesButton } from '@/components/CookieConsent';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import EmailSignupForm from './EmailSignupForm';
import { EDUCATION_PAGES, educationPageLabel } from '@/lib/seo/educationPageLinks';

const KofiIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/>
  </svg>
);

// py-2 keeps every link at the WCAG 2.5.8 24px tap-target floor.
const footerLinkClass = 'inline-block py-2 text-sm text-neo-white hover:text-neo-cyan transition-colors duration-100';
const legalLinkClass = 'inline-block py-2 text-sm text-neo-white hover:text-neo-lime transition-colors duration-100';
const bottomLinkClass = 'inline-block py-2 text-xs text-neo-white/80 hover:text-neo-lime transition-colors duration-100';
const headingClass = 'mb-2 font-neo-display text-xs font-black uppercase tracking-widest text-neo-lime';
const FEATURED_TEACHER_PAGES = 4;

interface FooterProps {
  className?: string;
}

export default function Footer({ className }: FooterProps): React.ReactElement {
  const { t, language } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const href = (path: string) => `/${language}${path}`;
  const copyright = t('legal.copyright', { year: new Date().getFullYear() });

  const modes = [
    { path: '/multiplayer', label: t('sitemap.multiplayer', 'Multiplayer') },
    { path: '/daily', label: t('sitemap.daily', 'Daily Challenge') },
    { path: '/connections', label: t('connections.title', 'Word Bridge') },
    { path: '/daily/archive', label: t('daily.archivePage.title', 'Past puzzles') },
    { path: '/download-word-game-android', label: t('footer.androidApp', 'Android App') },
  ];
  const resources = [
    { path: '/how-to-play', label: t('footer.howToPlay', 'How to Play') },
    { path: '/guides', label: t('footer.guides', 'Guides') },
    { path: '/word-of-the-day', label: t('footer.wordOfTheDay') },
    { path: '/tools/word-solver', label: t('footer.wordSolver') },
    { path: '/glossary', label: t('footer.glossary', 'Glossary') },
    { path: '/blog', label: t('footer.blog') },
  ];
  const company = [
    { path: '/about', label: t('footer.about') },
    { path: '/faq', label: t('footer.faq') },
    { path: '/contact', label: t('footer.contact') },
  ];
  const legal = [
    { path: '/legal/privacy', label: t('legal.privacyPolicy') },
    { path: '/legal/terms', label: t('legal.termsOfService') },
    { path: '/legal/refund', label: t('legal.refundPolicy') },
    { path: '/sitemap', label: t('footer.sitemap', 'Sitemap') },
  ];
  const linkList = (items: { path: string; label: string }[]) => (
    <ul>
      {items.map((item) => (
        <li key={item.path}>
          <Link prefetch={false} href={href(item.path)} className={footerLinkClass}>{item.label}</Link>
        </li>
      ))}
    </ul>
  );
  const teacherLink = (page: (typeof EDUCATION_PAGES)[number]) => (
    <li key={page.slug}>
      <Link prefetch={false} href={href(`/education/${page.slug}`)} className={footerLinkClass}>
        {educationPageLabel(page.slug, language)}
      </Link>
    </li>
  );

  return (
    <footer
      role="contentinfo"
      className={cn(
        'mt-auto border-t-3 border-neo-black bg-neo-navy text-white',
        className
      )}
    >
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {/* CrazyGames QA requires Privacy + Terms and nothing else */}
        {isOnCrazyGamesPlatform ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-center">
            <p className="text-xs text-neo-white">{copyright}</p>
            <nav aria-label={t('legal.title')} className="flex items-center gap-4">
              <Link prefetch={false} href={href('/legal/privacy')} className={legalLinkClass}>
                {t('legal.privacyPolicy')}
              </Link>
              <Link prefetch={false} href={href('/legal/terms')} className={legalLinkClass}>
                {t('legal.termsOfService')}
              </Link>
            </nav>
          </div>
        ) : (
        <>
        <div className="mb-8 grid gap-4 rounded-neo-lg border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard-sm sm:p-5 lg:grid-cols-[1fr_1.3fr] lg:items-center lg:gap-8">
          <h3 className="font-neo-display text-base font-black text-neo-white sm:text-lg">
            {t('newsletter.title')}
          </h3>
          <EmailSignupForm />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-[1.2fr_1fr_1fr_1.5fr]">
          <div className="col-span-2 flex flex-col gap-4 sm:col-span-3 lg:col-span-1">
            <Link prefetch={false} href={href('')} dir="ltr" aria-label="LexiClash" className="w-fit font-neo-display text-3xl font-bold text-neo-white">
              Lexi<span className="text-neo-lime">Clash</span>
            </Link>
            <nav aria-label={t('footer.connect', 'Connect')}>
              <h3 className={headingClass}>{t('footer.connect', 'Connect')}</h3>
              <ul className="flex flex-wrap gap-x-5">
                <li>
                  <a
                    href="https://www.instagram.com/lexi.clash"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Instagram (${t('common.opensInNewTab')})`}
                    className="inline-flex items-center gap-2 py-2 text-sm text-neo-white hover:text-neo-pink transition-colors duration-100"
                  >
                    <InstagramIcon size="1.1em" />
                    <span>Instagram</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://ko-fi.com/lexiclash"
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t('support.kofiTooltip')}
                    aria-label={`${t('support.kofiFooter')} (${t('common.opensInNewTab')})`}
                    className="inline-flex items-center gap-2 py-2 text-sm text-neo-pink hover:text-neo-lime transition-colors duration-100 group"
                  >
                    <KofiIcon className="group-hover:animate-bounce" />
                    <span>{t('support.kofiFooter')}</span>
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          <nav aria-label={t('sitemap.gameModes', 'Game Modes')}>
            <h3 className={headingClass}>{t('sitemap.gameModes', 'Game Modes')}</h3>
            {linkList(modes)}
          </nav>

          <nav aria-label={t('footer.resources', 'Resources')}>
            <h3 className={headingClass}>{t('footer.resources', 'Resources')}</h3>
            {linkList(resources)}
          </nav>

          {/* Every teacher landing stays in the server HTML: sitewide links are how they get crawled */}
          <nav aria-label={t('footer.forTeachers', 'For Teachers')} className="col-span-2 sm:col-span-1">
            <h3 className={headingClass}>{t('footer.forTeachers', 'For Teachers')}</h3>
            <ul>
              <li><Link prefetch={false} href={href('/education')} className={footerLinkClass}>{t('footer.educationHub', 'Education Hub')}</Link></li>
              {EDUCATION_PAGES.slice(0, FEATURED_TEACHER_PAGES).map(teacherLink)}
            </ul>
            <details className="peer group/teachers">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 py-2 text-sm font-bold text-neo-cyan transition-colors duration-100 marker:hidden hover:text-neo-lime focus-visible:rounded-[4px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan [&::-webkit-details-marker]:hidden">
                {t('homeFresh.close.teacherPages', 'All teacher pages')}
                <ChevronDown
                  aria-hidden="true"
                  className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 group-open/teachers:rotate-180"
                />
              </summary>
            </details>
            <ul className="hidden grid-cols-1 gap-x-4 peer-open:grid sm:grid-cols-2 lg:grid-cols-1">
              {EDUCATION_PAGES.slice(FEATURED_TEACHER_PAGES).map(teacherLink)}
            </ul>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-neo-cream/20 pt-4">
          <nav aria-label={t('legal.title')}>
            <ul className="flex flex-wrap items-center gap-x-5">
              {[...company, ...legal].map((item) => (
                <li key={item.path}>
                  <Link prefetch={false} href={href(item.path)} className={bottomLinkClass}>{item.label}</Link>
                </li>
              ))}
              <li className="text-xs [&_button]:py-2 [&_button]:text-xs [&_button]:text-neo-white/80 [&_button]:no-underline [&_button:hover]:text-neo-lime"><ManageCookiesButton /></li>
            </ul>
          </nav>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p className="text-xs text-neo-white/80">{copyright}</p>
            <span className="flex-1" aria-hidden="true" />
            <PermanentEgg kind="gingerbread" />
            <HolidaySeasonLink className="text-xs font-bold text-neo-holiday-gold underline-offset-4 hover:underline" />
            <a href="https://oddities.app/app/lexiclash?ref=badge">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://oddities.app/badge/lexiclash" alt="LexiClash on Oddities" height="20" width="204" loading="lazy" decoding="async" className="opacity-80 hover:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>
        </>
        )}
      </div>
    </footer>
  );
}
