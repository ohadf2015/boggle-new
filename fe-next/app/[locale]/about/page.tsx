'use client';

import React from 'react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';
import { Mail, Instagram } from 'lucide-react';
import { InstagramIcon } from '@/components/icons/SocialIcons';

export default function AboutPage(): React.ReactElement {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <LegalPageLayout title={t('legal.about.title')}>
      {/* Last Updated */}
      <p className={cn(
        'text-sm mb-6',
        isDarkMode ? 'text-gray-500' : 'text-gray-500'
      )}>
        {t('legal.lastUpdated')}: {t('legal.lastUpdatedDate')}
      </p>

      {/* Section 1: Who We Are */}
      <section className="mb-6">
        <h2 className={cn(
          'text-xl font-bold mb-3',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.about.whoWeAre.title')}
        </h2>
        <p className={cn(
          'leading-relaxed',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {t('legal.about.whoWeAre.content')}
        </p>
      </section>

      {/* Section 2: Our Mission */}
      <section className="mb-6">
        <h2 className={cn(
          'text-xl font-bold mb-3',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.about.mission.title')}
        </h2>
        <p className={cn(
          'leading-relaxed',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {t('legal.about.mission.content')}
        </p>
      </section>

      {/* Section 3: What We Do */}
      <section className="mb-6">
        <h2 className={cn(
          'text-xl font-bold mb-3',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.about.whatWeDo.title')}
        </h2>
        <p className={cn(
          'leading-relaxed',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {t('legal.about.whatWeDo.content')}
        </p>
      </section>

      {/* Section 4: Our Team */}
      <section className="mb-6">
        <h2 className={cn(
          'text-xl font-bold mb-3',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.about.team.title')}
        </h2>
        <p className={cn(
          'leading-relaxed',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {t('legal.about.team.content')}
        </p>
      </section>

      {/* Section 5: Contact Information */}
      <section className="mb-6">
        <h2 className={cn(
          'text-xl font-bold mb-3',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.about.contact.title')}
        </h2>
        <p className={cn(
          'leading-relaxed mb-4',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {t('legal.about.contact.content')}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Email */}
          <a
            href="mailto:lexiclash.game@gmail.com"
            className={cn(
              'flex items-center gap-3 p-4 rounded-neo border-3 border-neo-black transition-all hover:scale-[1.02]',
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700'
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

          {/* Instagram */}
          <a
            href="https://www.instagram.com/lexi.clash"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-3 p-4 rounded-neo border-3 border-neo-black transition-all hover:scale-[1.02]',
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700'
                : 'bg-white hover:bg-neo-cream shadow-hard hover:shadow-hard-lg'
            )}
          >
            <div className={cn(
              'w-12 h-12 rounded-lg flex items-center justify-center border-2 border-neo-black',
              'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400'
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
        </div>
      </section>

      {/* Section 6: Business Information */}
      <section className="mb-6">
        <h2 className={cn(
          'text-xl font-bold mb-3',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.about.businessInfo.title')}
        </h2>
        <div className={cn(
          'p-6 rounded-neo border-3 border-neo-black',
          isDarkMode ? 'bg-slate-800' : 'bg-white shadow-hard'
        )}>
          <dl className="space-y-4">
            <div>
              <dt className={cn('text-sm font-bold uppercase mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-500')}>
                {t('legal.about.businessInfo.companyLabel')}
              </dt>
              <dd className={cn('text-lg font-medium', isDarkMode ? 'text-white' : 'text-neo-black')}>
                {t('legal.about.businessInfo.company')}
              </dd>
            </div>
            <div>
              <dt className={cn('text-sm font-bold uppercase mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-500')}>
                {t('legal.about.businessInfo.emailLabel')}
              </dt>
              <dd className={cn('font-medium', isDarkMode ? 'text-white' : 'text-neo-black')}>
                {t('legal.about.businessInfo.email')}
              </dd>
            </div>
            <div>
              <dt className={cn('text-sm font-bold uppercase mb-1', isDarkMode ? 'text-gray-500' : 'text-gray-500')}>
                {t('legal.about.businessInfo.instagramLabel')}
              </dt>
              <dd className={cn('font-medium', isDarkMode ? 'text-white' : 'text-neo-black')}>
                {t('legal.about.businessInfo.instagram')}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </LegalPageLayout>
  );
}
