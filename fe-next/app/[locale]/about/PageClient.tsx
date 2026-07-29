'use client';

import { useParams } from 'next/navigation';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';
import { Mail, Gamepad2, Globe, BookOpen, Users, Shield, Zap } from 'lucide-react';
import { InstagramIcon } from '@/components/icons/SocialIcons';
import { InlineBannerAd } from '@/components/ads';
import { contentByLocale, type AboutContent } from './content';

function FeatureCard({
  icon: Icon,
  title,
  content,
  isDarkMode,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  content: string;
  isDarkMode: boolean;
}) {
  return (
    <div
      className={cn(
        'p-5 rounded-neo border-3 border-neo-black',
        isDarkMode ? 'bg-neo-navy-light' : 'bg-white shadow-hard'
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center border-2 border-neo-black',
            isDarkMode ? 'bg-neo-cyan' : 'bg-neo-lime'
          )}
        >
          <Icon className="w-5 h-5 text-neo-black" />
        </div>
        <h3 className={cn('font-bold text-lg', isDarkMode ? 'text-white' : 'text-gray-900')}>
          {title}
        </h3>
      </div>
      <p className={cn('leading-relaxed', isDarkMode ? 'text-gray-300' : 'text-gray-600')}>
        {content}
      </p>
    </div>
  );
}

export default function AboutPageClient(): React.ReactElement {
  const params = useParams();
  const locale = params.locale as string;
  const c: AboutContent = contentByLocale[locale] || contentByLocale.en;
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
      title={c.title}
      lastUpdated={c.lastUpdated}
      breadcrumbs={[{ label: c.title }]}
    >

      {/* Section 1: Who We Are */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>{c.whoWeAre.title}</h2>
        <p className={cn(paragraphClass, 'mb-4')}>{c.whoWeAre.content}</p>
        <p className={paragraphClass}>{c.whoWeAre.content2}</p>
      </section>

      {/* Section 2: Our Story */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>{c.story.title}</h2>
        <p className={cn(paragraphClass, 'mb-4')}>{c.story.content}</p>
        <p className={paragraphClass}>{c.story.content2}</p>
      </section>

      {/* Section 3: Our Mission */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>{c.mission.title}</h2>
        <p className={cn(paragraphClass, 'mb-4')}>{c.mission.content}</p>
        <p className={paragraphClass}>{c.mission.content2}</p>
      </section>

      {/* Section 4: What Makes Us Different */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>{c.whatMakesUsDifferent.title}</h2>
        <p className={cn(paragraphClass, 'mb-5')}>{c.whatMakesUsDifferent.intro}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard
            icon={Gamepad2}
            title={c.whatMakesUsDifferent.gameModes.title}
            content={c.whatMakesUsDifferent.gameModes.content}
            isDarkMode={isDarkMode}
          />
          <FeatureCard
            icon={Globe}
            title={c.whatMakesUsDifferent.multilingual.title}
            content={c.whatMakesUsDifferent.multilingual.content}
            isDarkMode={isDarkMode}
          />
          <FeatureCard
            icon={BookOpen}
            title={c.whatMakesUsDifferent.education.title}
            content={c.whatMakesUsDifferent.education.content}
            isDarkMode={isDarkMode}
          />
          <FeatureCard
            icon={Shield}
            title={c.whatMakesUsDifferent.design.title}
            content={c.whatMakesUsDifferent.design.content}
            isDarkMode={isDarkMode}
          />
        </div>
      </section>

      <InlineBannerAd webZone="content-page" className="my-6" />

      {/* Section 5: What We Do */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>{c.whatWeDo.title}</h2>
        <p className={cn(paragraphClass, 'mb-4')}>{c.whatWeDo.content}</p>
        <p className={paragraphClass}>{c.whatWeDo.content2}</p>
      </section>

      {/* Section 6: Technology */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>{c.technology.title}</h2>
        <p className={cn(paragraphClass, 'mb-4')}>{c.technology.content}</p>
        <p className={paragraphClass}>{c.technology.content2}</p>
      </section>

      {/* Section 7: For Educators */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>{c.forEducators.title}</h2>
        <p className={cn(paragraphClass, 'mb-4')}>{c.forEducators.content}</p>
        <p className={paragraphClass}>{c.forEducators.content2}</p>
      </section>

      {/* Section 8: Community */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>{c.community.title}</h2>
        <p className={cn(paragraphClass, 'mb-4')}>{c.community.content}</p>
        <p className={paragraphClass}>{c.community.content2}</p>
      </section>

      <InlineBannerAd webZone="content-page" className="my-6" />

      {/* Section 9: Values */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>{c.values.title}</h2>
        <p className={cn(paragraphClass, 'mb-4')}>{c.values.content}</p>
        <div className="grid gap-4 sm:grid-cols-3 mt-5">
          {([
            { icon: Users, data: c.values.accessibility },
            { icon: Shield, data: c.values.privacy },
            { icon: Zap, data: c.values.fairPlay },
          ] as const).map(({ icon: ValIcon, data }) => (
            <div
              key={data.title}
              className={cn(
                'p-4 rounded-neo border-3 border-neo-black text-center',
                isDarkMode ? 'bg-neo-navy-light' : 'bg-white shadow-hard'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center border-2 border-neo-black mx-auto mb-3',
                  isDarkMode ? 'bg-neo-pink' : 'bg-neo-pink'
                )}
              >
                <ValIcon className="w-5 h-5 text-white" />
              </div>
              <h3 className={cn('font-bold mb-2', isDarkMode ? 'text-white' : 'text-gray-900')}>
                {data.title}
              </h3>
              <p className={cn('text-sm leading-relaxed', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                {data.content}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 10: Our Team */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>{c.team.title}</h2>
        <p className={paragraphClass}>{c.team.content}</p>
      </section>

      {/* Section 11: Contact Information */}
      <section className="mb-8">
        <h2 className={sectionHeadingClass}>{c.contact.title}</h2>
        <p className={cn(paragraphClass, 'mb-4')}>{c.contact.content}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href="mailto:lexiclash.game@gmail.com"
            className={cn(
              'flex items-center gap-3 p-4 rounded-neo border-3 border-neo-black transition-all hover:scale-[1.02]',
              isDarkMode
                ? 'bg-neo-navy-light hover:bg-neo-navy-elevated'
                : 'bg-white hover:bg-neo-cream shadow-hard hover:shadow-hard-lg'
            )}
          >
            <div className="w-12 h-12 rounded-lg flex items-center justify-center border-2 border-neo-black bg-neo-cyan">
              <Mail className="w-6 h-6 text-neo-black" />
            </div>
            <div>
              <p className={cn('font-bold', isDarkMode ? 'text-white' : 'text-neo-black')}>
                {c.businessInfo.emailLabel}
              </p>
              <p className={cn('text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                lexiclash.game@gmail.com
              </p>
            </div>
          </a>

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
        </div>
      </section>

      {/* Section 12: Business Information */}
      <section className="mb-6">
        <h2 className={sectionHeadingClass}>{c.businessInfo.title}</h2>
        <div className={cn(
          'p-6 rounded-neo border-3 border-neo-black',
          isDarkMode ? 'bg-neo-navy-light' : 'bg-white shadow-hard'
        )}>
          <dl className="space-y-4">
            {([
              [c.businessInfo.companyLabel, c.businessInfo.company],
              [c.businessInfo.founderLabel, c.businessInfo.founder],
              [c.businessInfo.locationLabel, c.businessInfo.location],
              [c.businessInfo.foundedLabel, c.businessInfo.founded],
              [c.businessInfo.emailLabel, c.businessInfo.email],
              [c.businessInfo.instagramLabel, c.businessInfo.instagram],
            ] as const).map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm font-bold uppercase mb-1 text-gray-500">{label}</dt>
                <dd className={cn('font-medium', isDarkMode ? 'text-white' : 'text-neo-black')}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </LegalPageLayout>
  );
}
