'use client';

import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';

export default function DisclaimerPageClient(): React.ReactElement {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const sectionClass = cn(
    'leading-relaxed',
    isDarkMode ? 'text-gray-300' : 'text-gray-600'
  );

  const headingClass = cn(
    'text-xl font-bold mb-3',
    isDarkMode ? 'text-white' : 'text-gray-900'
  );

  return (
    <LegalPageLayout title={t('legal.disclaimer.title') || 'Disclaimer'}>
      {/* Last Updated */}
      <p className="text-sm mb-6 text-gray-500">
        {t('legal.lastUpdated')}: {t('legal.lastUpdatedDate')}
      </p>

      {/* General Disclaimer */}
      <section className="mb-6">
        <h2 className={headingClass}>
          {t('legal.disclaimer.general.title') || 'General Disclaimer'}
        </h2>
        <p className={sectionClass}>
          {t('legal.disclaimer.general.content') || 'The information provided on LexiClash is for general entertainment and educational purposes only. While we strive for accuracy, we make no warranties or representations regarding the completeness, accuracy, or reliability of any content on this website. Your use of the site and reliance on any information is at your own risk.'}
        </p>
      </section>

      {/* No Professional Advice */}
      <section className="mb-6">
        <h2 className={headingClass}>
          {t('legal.disclaimer.noProfessionalAdvice.title') || 'Not Professional Advice'}
        </h2>
        <p className={sectionClass}>
          {t('legal.disclaimer.noProfessionalAdvice.content') || 'LexiClash is a word game platform. Nothing on this website constitutes professional, educational, linguistic, or any other form of advice. The game content, word definitions, and educational features are provided for entertainment and should not be relied upon as authoritative language references.'}
        </p>
      </section>

      {/* As-Is */}
      <section className="mb-6">
        <h2 className={headingClass}>
          {t('legal.disclaimer.asIs.title') || '"As Is" Basis'}
        </h2>
        <p className={sectionClass}>
          {t('legal.disclaimer.asIs.content') || 'LexiClash is provided on an "as is" and "as available" basis without any warranties of any kind, either express or implied. We do not guarantee that the service will be uninterrupted, secure, or error-free. Game scores, leaderboards, and statistics are provided for entertainment purposes.'}
        </p>
      </section>

      {/* Third-Party Links */}
      <section className="mb-6">
        <h2 className={headingClass}>
          {t('legal.disclaimer.thirdParty.title') || 'Third-Party Links & Content'}
        </h2>
        <p className={sectionClass}>
          {t('legal.disclaimer.thirdParty.content') || 'LexiClash may contain links to third-party websites or services. We have no control over the content, privacy policies, or practices of any third-party sites. We do not endorse or assume responsibility for any third-party content, products, or services.'}
        </p>
      </section>

      {/* Advertising Content */}
      <section className="mb-6">
        <h2 className={headingClass}>
          {t('legal.disclaimer.advertising.title') || 'Advertising Content'}
        </h2>
        <p className={sectionClass}>
          {t('legal.disclaimer.advertising.content') || 'LexiClash displays advertisements provided by third-party ad networks including Google AdSense. These ads are not endorsements by LexiClash. Ad content is determined by the ad networks based on various factors and may not reflect the views or values of LexiClash. We are not responsible for the accuracy or content of advertisements displayed on the site.'}
        </p>
      </section>

      {/* Limitation of Liability */}
      <section className="mb-6">
        <h2 className={headingClass}>
          {t('legal.disclaimer.liability.title') || 'Limitation of Liability'}
        </h2>
        <p className={sectionClass}>
          {t('legal.disclaimer.liability.content') || 'To the fullest extent permitted by law, LexiClash and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service, including but not limited to loss of data, loss of profits, or interruption of service.'}
        </p>
      </section>

      {/* Changes to Disclaimer */}
      <section className="mb-6">
        <h2 className={headingClass}>
          {t('legal.disclaimer.changes.title') || 'Changes to This Disclaimer'}
        </h2>
        <p className={sectionClass}>
          {t('legal.disclaimer.changes.content') || 'We reserve the right to update this disclaimer at any time. Changes will be posted on this page with an updated revision date. Your continued use of LexiClash after changes constitutes acceptance of the updated disclaimer.'}
        </p>
      </section>

      {/* Contact */}
      <section className="mb-6">
        <h2 className={headingClass}>
          {t('legal.disclaimer.contact.title') || 'Contact Us'}
        </h2>
        <p className={sectionClass}>
          {t('legal.disclaimer.contact.content') || 'If you have questions about this disclaimer, please contact us at lexiclash.game@gmail.com.'}
        </p>
      </section>
    </LegalPageLayout>
  );
}
