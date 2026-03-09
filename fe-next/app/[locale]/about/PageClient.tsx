'use client';

import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';
import { Mail, Gamepad2, Globe, BookOpen, Users, Shield, Zap } from 'lucide-react';
import { InstagramIcon } from '@/components/icons/SocialIcons';

function FeatureCard({
  icon: Icon,
  titleKey,
  contentKey,
  isDarkMode,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  contentKey: string;
  isDarkMode: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div
      className={cn(
        'p-5 rounded-neo border-3 border-neo-black',
        isDarkMode ? 'bg-slate-800' : 'bg-white shadow-hard'
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center border-2 border-neo-black',
            isDarkMode ? 'bg-neo-cyan' : 'bg-neo-yellow'
          )}
        >
          <Icon className="w-5 h-5 text-neo-black" />
        </div>
        <h3 className={cn('font-bold text-lg', isDarkMode ? 'text-white' : 'text-gray-900')}>
          {t(titleKey)}
        </h3>
      </div>
      <p className={cn('leading-relaxed', isDarkMode ? 'text-gray-300' : 'text-gray-600')}>
        {t(contentKey)}
      </p>
    </div>
  );
}

export default function AboutPageClient(): React.ReactElement {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const sectionHeadingClass = cn(
    'text-xl font-bold mb-3',
    isDarkMode ? 'text-white' : 'text-gray-900'
  );
  const paragraphClass = cn(
    'leading-relaxed',
    isDarkMode ? 'text-gray-300' : 'text-gray-600'
  );

  return (
    <LegalPageLayout
      title={t('legal.about.title')}
      breadcrumbs={[{ label: t('legal.about.title') }]}
    >
      {/* Last Updated */}
      <p className="text-sm mb-6 text-gray-500">
        {t('legal.lastUpdated')}: {t('legal.lastUpdatedDate')}
      </p>

      {/* Section 1: Who We Are */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>
          {t('legal.about.whoWeAre.title')}
        </h2>
        <p className={cn(paragraphClass, 'mb-4')}>
          {t('legal.about.whoWeAre.content')}
        </p>
        <p className={paragraphClass}>
          {t('legal.about.whoWeAre.content2')}
        </p>
      </section>

      {/* Section 2: Our Story */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>
          {t('legal.about.story.title')}
        </h2>
        <p className={cn(paragraphClass, 'mb-4')}>
          {t('legal.about.story.content')}
        </p>
        <p className={paragraphClass}>
          {t('legal.about.story.content2')}
        </p>
      </section>

      {/* Section 3: Our Mission */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>
          {t('legal.about.mission.title')}
        </h2>
        <p className={cn(paragraphClass, 'mb-4')}>
          {t('legal.about.mission.content')}
        </p>
        <p className={paragraphClass}>
          {t('legal.about.mission.content2')}
        </p>
      </section>

      {/* Section 4: What Makes Us Different */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>
          {t('legal.about.whatMakesUsDifferent.title')}
        </h2>
        <p className={cn(paragraphClass, 'mb-5')}>
          {t('legal.about.whatMakesUsDifferent.intro')}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard
            icon={Gamepad2}
            titleKey="legal.about.whatMakesUsDifferent.gameModes.title"
            contentKey="legal.about.whatMakesUsDifferent.gameModes.content"
            isDarkMode={isDarkMode}
          />
          <FeatureCard
            icon={Globe}
            titleKey="legal.about.whatMakesUsDifferent.multilingual.title"
            contentKey="legal.about.whatMakesUsDifferent.multilingual.content"
            isDarkMode={isDarkMode}
          />
          <FeatureCard
            icon={BookOpen}
            titleKey="legal.about.whatMakesUsDifferent.education.title"
            contentKey="legal.about.whatMakesUsDifferent.education.content"
            isDarkMode={isDarkMode}
          />
          <FeatureCard
            icon={Shield}
            titleKey="legal.about.whatMakesUsDifferent.design.title"
            contentKey="legal.about.whatMakesUsDifferent.design.content"
            isDarkMode={isDarkMode}
          />
        </div>
      </section>

      {/* Section 5: What We Do */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>
          {t('legal.about.whatWeDo.title')}
        </h2>
        <p className={cn(paragraphClass, 'mb-4')}>
          {t('legal.about.whatWeDo.content')}
        </p>
        <p className={paragraphClass}>
          {t('legal.about.whatWeDo.content2')}
        </p>
      </section>

      {/* Section 6: Technology */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>
          {t('legal.about.technology.title')}
        </h2>
        <p className={cn(paragraphClass, 'mb-4')}>
          {t('legal.about.technology.content')}
        </p>
        <p className={paragraphClass}>
          {t('legal.about.technology.content2')}
        </p>
      </section>

      {/* Section 7: For Educators */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>
          {t('legal.about.forEducators.title')}
        </h2>
        <p className={cn(paragraphClass, 'mb-4')}>
          {t('legal.about.forEducators.content')}
        </p>
        <p className={paragraphClass}>
          {t('legal.about.forEducators.content2')}
        </p>
      </section>

      {/* Section 8: Community */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>
          {t('legal.about.community.title')}
        </h2>
        <p className={cn(paragraphClass, 'mb-4')}>
          {t('legal.about.community.content')}
        </p>
        <p className={paragraphClass}>
          {t('legal.about.community.content2')}
        </p>
      </section>

      {/* Section 9: Values */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>
          {t('legal.about.values.title')}
        </h2>
        <p className={cn(paragraphClass, 'mb-4')}>
          {t('legal.about.values.content')}
        </p>
        <div className="grid gap-4 sm:grid-cols-3 mt-5">
          {[
            { icon: Users, key: 'accessibility' },
            { icon: Shield, key: 'privacy' },
            { icon: Zap, key: 'fairPlay' },
          ].map(({ icon: ValIcon, key }) => (
            <div
              key={key}
              className={cn(
                'p-4 rounded-neo border-3 border-neo-black text-center',
                isDarkMode ? 'bg-slate-800' : 'bg-white shadow-hard'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center border-2 border-neo-black mx-auto mb-3',
                  isDarkMode ? 'bg-neo-pink' : 'bg-neo-orange'
                )}
              >
                <ValIcon className="w-5 h-5 text-white" />
              </div>
              <h3 className={cn('font-bold mb-2', isDarkMode ? 'text-white' : 'text-gray-900')}>
                {t(`legal.about.values.${key}.title`)}
              </h3>
              <p className={cn('text-sm leading-relaxed', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                {t(`legal.about.values.${key}.content`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 10: Our Team */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>
          {t('legal.about.team.title')}
        </h2>
        <p className={paragraphClass}>
          {t('legal.about.team.content')}
        </p>
      </section>

      {/* Section 11: Contact Information */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>
          {t('legal.about.contact.title')}
        </h2>
        <p className={cn(paragraphClass, 'mb-4')}>
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
            <div className="w-12 h-12 rounded-lg flex items-center justify-center border-2 border-neo-black bg-neo-cyan">
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

      {/* Section 12: Business Information */}
      <section className="mb-6">
        <h2 className={sectionHeadingClass}>
          {t('legal.about.businessInfo.title')}
        </h2>
        <div className={cn(
          'p-6 rounded-neo border-3 border-neo-black',
          isDarkMode ? 'bg-slate-800' : 'bg-white shadow-hard'
        )}>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-bold uppercase mb-1 text-gray-500">
                {t('legal.about.businessInfo.companyLabel')}
              </dt>
              <dd className={cn('text-lg font-medium', isDarkMode ? 'text-white' : 'text-neo-black')}>
                {t('legal.about.businessInfo.company')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-bold uppercase mb-1 text-gray-500">
                {t('legal.about.businessInfo.founderLabel')}
              </dt>
              <dd className={cn('font-medium', isDarkMode ? 'text-white' : 'text-neo-black')}>
                {t('legal.about.businessInfo.founder')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-bold uppercase mb-1 text-gray-500">
                {t('legal.about.businessInfo.locationLabel')}
              </dt>
              <dd className={cn('font-medium', isDarkMode ? 'text-white' : 'text-neo-black')}>
                {t('legal.about.businessInfo.location')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-bold uppercase mb-1 text-gray-500">
                {t('legal.about.businessInfo.foundedLabel')}
              </dt>
              <dd className={cn('font-medium', isDarkMode ? 'text-white' : 'text-neo-black')}>
                {t('legal.about.businessInfo.founded')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-bold uppercase mb-1 text-gray-500">
                {t('legal.about.businessInfo.emailLabel')}
              </dt>
              <dd className={cn('font-medium', isDarkMode ? 'text-white' : 'text-neo-black')}>
                {t('legal.about.businessInfo.email')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-bold uppercase mb-1 text-gray-500">
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
