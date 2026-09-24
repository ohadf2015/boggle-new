'use client';

import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';
import { FINE_BODY, FINE_LINK } from './FreshFinePrint';

/**
 * The two link moments of the homepage FAQ card (gauntlet round 3, second
 * run: "delete the duplicate link row entirely"; round 6: both sit in the
 * card's footer, under its one accordion):
 *
 * - FreshFaqAll: "See the full FAQ", visible at rest (same pattern as the
 *   blog's "All articles").
 * - FreshReadMore: ONE sentence with the editorial links inline (how to play,
 *   strategy guides, blog). The AdSense remediation needs them on the page
 *   (HomepageContentSection.test); as prose they no longer read as a third
 *   list of links stacked onto the site footer.
 *
 * useLanguageSafe: HomepageContentSection is a server component that is also
 * rendered standalone in tests, outside any LanguageProvider.
 */

export function FreshFaqAll({ locale }: { locale: string }) {
  const { t } = useLanguageSafe();
  return (
    <Link
      prefetch={false}
      href={`/${locale}/faq`}
      className="inline-flex min-h-11 items-center gap-1 font-neo-body text-sm font-bold text-neo-cyan underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan md:text-base"
    >
      {t('homeFresh.close.faqAll')}
      <DirectionalIcon icon={ArrowRight} className="h-4 w-4" />
    </Link>
  );
}

const READ_MORE = ['howToPlay', 'guides', 'blog'] as const;
type ReadMoreKey = (typeof READ_MORE)[number];

const READ_MORE_PATH: Record<ReadMoreKey, string> = {
  howToPlay: 'how-to-play',
  guides: 'guides',
  blog: 'blog',
};

const TOKEN = /\{(howToPlay|guides|blog)\}/;

export function FreshReadMore({ locale, className }: { locale: string; className?: string }) {
  const { t } = useLanguageSafe();
  const link = (key: ReadMoreKey) => (
    <Link prefetch={false} href={`/${locale}/${READ_MORE_PATH[key]}`} className={FINE_LINK}>
      {t(`homeFresh.close.readMoreLinks.${key}`)}
    </Link>
  );

  // The sentence carries {howToPlay} {guides} {blog} placeholders so each
  // locale orders them naturally. split() with a capture group alternates
  // text and token names. Any token a template lacks is appended, so the
  // links can never silently drop out of the page.
  const parts = t('homeFresh.close.readMore').split(TOKEN);
  const used = new Set<string>();
  const nodes: ReactNode[] = parts.map((part, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
    used.add(part);
    return <Fragment key={i}>{link(part as ReadMoreKey)}</Fragment>;
  });
  for (const key of READ_MORE) {
    if (!used.has(key)) nodes.push(<Fragment key={key}> {link(key)}</Fragment>);
  }

  return (
    <p data-home-tail="readmore" className={cn('max-w-[60ch]', FINE_BODY, className)}>
      {nodes}
    </p>
  );
}
