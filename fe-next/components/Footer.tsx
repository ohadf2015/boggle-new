'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { InstagramIcon } from '@/components/icons/SocialIcons';
import { ManageCookiesButton } from '@/components/CookieConsent';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

const KofiIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/>
  </svg>
);

// `inline-block py-2` raises the tappable area to ~30px (14px text + 16px
// padding), clearing WCAG 2.5.8 Target Size Minimum (AA, 24×24). Audit
// 2026-05-02 (M1) — footer links were 19px tall sitewide.
const footerLinkClass = 'inline-block py-2 text-sm text-neo-white hover:text-neo-cyan transition-colors duration-100';
const legalLinkClass = 'inline-block py-2 text-sm text-neo-white hover:text-neo-lime transition-colors duration-100';

interface FooterProps {
  className?: string;
}

export default function Footer({ className }: FooterProps): React.ReactElement {
  const { t, language } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();

  return (
    <footer
      role="contentinfo"
      className={cn(
        'mt-auto border-t-3 border-neo-black bg-neo-navy text-white',
        className
      )}
    >
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {/* On CrazyGames: minimal legal strip (Privacy + Terms required by CrazyGames QA) */}
        {isOnCrazyGamesPlatform ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-center">
            <p className="text-xs text-neo-white">
              {t('legal.copyright', { year: new Date().getFullYear() })}
            </p>
            <nav aria-label={t('legal.title')} className="flex items-center gap-4">
              <Link prefetch={false} href={`/${language}/legal/privacy`} className={legalLinkClass}>
                {t('legal.privacyPolicy')}
              </Link>
              <Link prefetch={false} href={`/${language}/legal/terms`} className={legalLinkClass}>
                {t('legal.termsOfService')}
              </Link>
            </nav>
          </div>
        ) : (
        <>
        {/* Link columns */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          {/* Explore */}
          <nav aria-label={t('footer.explore', 'Explore')}>
            <h3 className="text-xs font-black uppercase tracking-widest text-neo-lime mb-3">
              {t('footer.explore', 'Explore')}
            </h3>
            <ul className="space-y-2">
              <li><Link prefetch={false} href={`/${language}/about`} className={footerLinkClass}>{t('footer.about')}</Link></li>
              <li><Link prefetch={false} href={`/${language}/how-to-play`} className={footerLinkClass}>{t('footer.howToPlay', 'How to Play')}</Link></li>
              <li><Link prefetch={false} href={`/${language}/blog`} className={footerLinkClass}>{t('footer.blog')}</Link></li>
              <li><Link prefetch={false} href={`/${language}/faq`} className={footerLinkClass}>{t('footer.faq')}</Link></li>
              <li><Link prefetch={false} href={`/${language}/contact`} className={footerLinkClass}>{t('footer.contact')}</Link></li>
              {/* Sitewide link into the Play Store install landing — it was
                  crawl-orphaned (sitemap-only) and the install popup only
                  fires on Android browsers. Same crawl-equity rationale as
                  the For Teachers cluster above. */}
              <li><Link prefetch={false} href={`/${language}/download-word-game-android`} className={footerLinkClass}>{t('footer.androidApp', 'Android App')}</Link></li>
            </ul>
          </nav>

          {/* For Teachers — sitewide links into the /education landings.
              These pages were crawl-orphaned (linked only from the rarely
              crawled hub); sitewide footer links flow crawl equity from every
              page so Google discovers + ranks them. See
              docs/2026-05-30-education-teacher-seo-intent.md. */}
          <nav aria-label={t('footer.forTeachers', 'For Teachers')}>
            <h3 className="text-xs font-black uppercase tracking-widest text-neo-lime mb-3">
              {t('footer.forTeachers', 'For Teachers')}
            </h3>
            <ul className="space-y-2">
              <li><Link prefetch={false} href={`/${language}/education`} className={footerLinkClass}>{t('footer.educationHub', 'Education Hub')}</Link></li>
              <li><Link prefetch={false} href={`/${language}/education/vocabulary-games-classroom`} className={footerLinkClass}>{t('footer.vocabularyGames', 'Vocabulary Games')}</Link></li>
              <li><Link prefetch={false} href={`/${language}/education/games-for-teachers`} className={footerLinkClass}>{t('footer.gamesForTeachers', 'Games for Teachers')}</Link></li>
              <li><Link prefetch={false} href={`/${language}/education/esl-word-games`} className={footerLinkClass}>{t('footer.eslWordGames', 'ESL Word Games')}</Link></li>
              <li><Link prefetch={false} href={`/${language}/education/for-schools`} className={footerLinkClass}>{t('footer.forSchools', 'For Schools')}</Link></li>
              <li><Link prefetch={false} href={`/${language}/education/spelling-bee-practice`} className={footerLinkClass}>{t('footer.spellingBeePractice', 'Spelling Bee Practice')}</Link></li>
            </ul>
          </nav>

          {/* Resources */}
          <nav aria-label={t('footer.resources', 'Resources')}>
            <h3 className="text-xs font-black uppercase tracking-widest text-neo-lime mb-3">
              {t('footer.resources', 'Resources')}
            </h3>
            <ul className="space-y-2">
              <li><Link prefetch={false} href={`/${language}/word-of-the-day`} className={footerLinkClass}>{t('footer.wordOfTheDay')}</Link></li>
              <li><Link prefetch={false} href={`/${language}/guides`} className={footerLinkClass}>{t('footer.guides', 'Guides')}</Link></li>
              <li><Link prefetch={false} href={`/${language}/glossary`} className={footerLinkClass}>{t('footer.glossary', 'Glossary')}</Link></li>
              <li><Link prefetch={false} href={`/${language}/tools/word-solver`} className={footerLinkClass}>{t('footer.wordSolver')}</Link></li>
              <li><Link prefetch={false} href={`/${language}/sitemap`} className={footerLinkClass}>{t('footer.sitemap', 'Sitemap')}</Link></li>
            </ul>
          </nav>

          {/* Legal */}
          <nav aria-label={t('legal.title')}>
            <h3 className="text-xs font-black uppercase tracking-widest text-neo-lime mb-3">
              {t('legal.title')}
            </h3>
            <ul className="space-y-2">
              <li><Link prefetch={false} href={`/${language}/legal`} className={legalLinkClass}>{t('legal.title')}</Link></li>
              <li><Link prefetch={false} href={`/${language}/legal/privacy`} className={legalLinkClass}>{t('legal.privacyPolicy')}</Link></li>
              <li><Link prefetch={false} href={`/${language}/legal/terms`} className={legalLinkClass}>{t('legal.termsOfService')}</Link></li>
              <li><Link prefetch={false} href={`/${language}/legal/refund`} className={legalLinkClass}>{t('legal.refundPolicy')}</Link></li>
              <li><ManageCookiesButton /></li>
            </ul>
          </nav>

          {/* Connect */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-neo-lime mb-3">
              {t('footer.connect', 'Connect')}
            </h3>
            <ul className="space-y-3">
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
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-neo-cream/20 pt-4">
          <p className="text-xs text-neo-white">
            {t('legal.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
        </>
        )}
      </div>
    </footer>
  );
}
