'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';
import { contentByLocale, type PrivacyContent } from './content';
import { linkify } from '@/lib/legal/linkify';

/** Renders plain text with any embedded https:// URL turned into a real, clickable link. */
function Linkified({ text, linkClassName }: { text: string; linkClassName: string }): React.ReactElement {
  return (
    <>
      {linkify(text).map((part, i) =>
        part.type === 'url' ? (
          <a
            key={i}
            href={part.value}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
          >
            {part.value}
          </a>
        ) : (
          <React.Fragment key={i}>{part.value}</React.Fragment>
        ),
      )}
    </>
  );
}

export default function PrivacyPolicyPageClient(): React.ReactElement {
  const params = useParams();
  const locale = params.locale as string;
  const c: PrivacyContent = contentByLocale[locale] || contentByLocale.en;
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const headingClass = cn('text-xl font-bold mb-3', isDarkMode ? 'text-white' : 'text-gray-900');
  const textClass = cn('leading-relaxed', isDarkMode ? 'text-gray-300' : 'text-gray-600');
  const listClass = cn('list-disc ps-6 space-y-2', isDarkMode ? 'text-gray-300' : 'text-gray-600');
  const subheadingClass = cn('text-lg font-semibold mb-2 mt-4', isDarkMode ? 'text-white' : 'text-gray-900');
  const linkClass = cn('underline underline-offset-2 break-words', isDarkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-700 hover:text-blue-900');

  return (
    <LegalPageLayout title={c.title} lastUpdated="2026-09-25">
      {/* Introduction */}
      <p className={cn('text-lg mb-6', textClass)}><Linkified text={c.intro} linkClassName={linkClass} /></p>

      {/* All sections */}
      {c.sections.map((section) => (
        <section key={section.title} className="mb-6">
          <h2 className={headingClass}>{section.title}</h2>
          <p className={cn(textClass, section.items || section.subsections ? 'mb-3' : '')}>
            <Linkified text={section.content} linkClassName={linkClass} />
          </p>

          {/* Bullet items */}
          {section.items && (
            <ul className={listClass}>
              {section.items.map((item) => (
                <li key={item}><Linkified text={item} linkClassName={linkClass} /></li>
              ))}
            </ul>
          )}

          {/* Subsections (e.g. advertising) */}
          {section.subsections?.map((sub) => (
            <div key={sub.title}>
              <h3 className={subheadingClass}>{sub.title}</h3>
              {sub.content && <p className={cn(textClass, 'mb-2')}><Linkified text={sub.content} linkClassName={linkClass} /></p>}
              {sub.items && (
                <ul className={cn(listClass, 'mb-3')}>
                  {sub.items.map((item) => (
                    <li key={item}><Linkified text={item} linkClassName={linkClass} /></li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      ))}
    </LegalPageLayout>
  );
}
