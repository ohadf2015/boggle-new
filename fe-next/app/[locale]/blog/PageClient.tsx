'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { safeToLocaleDateString } from '@/utils/bcp47Locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
import { LandingHero, LandingPage, Prose } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import AutoHideHeader from '@/components/AutoHideHeader';
import { InlineBannerAd } from '@/components/ads';
import { blogPostsContent, getSortedBlogPosts, type BlogPost } from '@/lib/blog/data';

// Contextual link to the education hub — teachers reading vocabulary/word-game
// posts are a natural audience for the classroom tools, and this page had no
// internal link to /education at all.
const educationCta: Record<string, string> = {
  en: 'Teaching a class? Try our free classroom word games',
  he: 'מלמדים כיתה? נסו את משחקי המילים החינמיים לכיתה',
  sv: 'Undervisar du en klass? Prova våra gratis ordspel för klassrummet',
  ja: '授業で使いたい先生へ — 無料のクラス向けワードゲームはこちら',
  es: '¿Enseñas en un aula? Prueba nuestros juegos de palabras gratuitos para la clase',
};

const CARD =
  'group flex flex-col overflow-hidden rounded-neo-lg border-3 border-neo-black bg-neo-cream text-neo-black shadow-hard-xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-white motion-safe:transition-transform motion-safe:hover:-translate-y-1';

export default function BlogIndexPageClient(): React.ReactElement {
  const { t, language } = useLanguage();
  const params = useParams();
  const locale = params.locale as string;

  const content = blogPostsContent[locale] || blogPostsContent.en;
  const posts = getSortedBlogPosts().filter((post) => content.posts[post.slug]);
  const [featured, ...rest] = posts;

  const meta = (post: BlogPost, readTime: string) => (
    <span className="flex items-center gap-4 text-xs text-neo-black/70">
      <span className="flex items-center gap-1">
        <Calendar aria-hidden className="h-3 w-3" />
        {safeToLocaleDateString(new Date(post.date), language, { month: 'short', day: 'numeric', year: 'numeric' })}
      </span>
      <span className="flex items-center gap-1">
        <Clock aria-hidden className="h-3 w-3" />
        {readTime}
      </span>
    </span>
  );
  const badge = (label: string) => (
    <span className="self-start rounded-full border-2 border-neo-black bg-neo-yellow px-3 py-0.5 text-xs font-bold uppercase">{label}</span>
  );

  return (
    <div className="flex min-h-screen flex-col bg-neo-navy">
      <AutoHideHeader />
      <LandingPage locale={locale} topBar={false}>
        <div className="flex flex-col gap-6">
          <Link
            href={`/${locale}`}
            className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-full border-2 border-neo-white/25 px-4 text-sm font-bold text-neo-white/85 hover:border-neo-white/60 hover:text-neo-white"
          >
            <ArrowLeft aria-hidden className="h-4 w-4 rtl:rotate-180" />
            {t('common.back')}
          </Link>
          <LandingHero title={content.pageTitle} lead={content.pageSubtitle} art={LANDING_ART.reading('')} artTone="yellow" />
        </div>

        <InlineBannerAd webZone="content-page" />

        {featured && (
          <Link href={`/${locale}/blog/${featured.slug}`} className={cn(CARD, 'lg:flex-row')}>
            <div className="relative aspect-video w-full shrink-0 overflow-hidden border-b-3 border-neo-black lg:aspect-auto lg:w-3/5 lg:border-b-0 lg:border-e-3">
              <Image
                src={featured.image}
                alt={content.posts[featured.slug].title}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                priority
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center gap-3 p-6 lg:p-8">
              {badge(content.posts[featured.slug].category)}
              <h2 className="font-neo-display text-2xl font-bold leading-tight sm:text-3xl">{content.posts[featured.slug].title}</h2>
              <p className="leading-relaxed">{content.posts[featured.slug].excerpt}</p>
              {meta(featured, content.posts[featured.slug].readTime)}
            </div>
          </Link>
        )}

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((post, index) => {
            const postContent = content.posts[post.slug];
            return (
              <Link key={post.slug} href={`/${locale}/blog/${post.slug}`} className={CARD}>
                <div className="relative aspect-video w-full overflow-hidden border-b-3 border-neo-black">
                  <Image
                    src={post.image}
                    alt={postContent.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority={index < 2}
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  {badge(postContent.category)}
                  <h2 className="line-clamp-2 font-neo-display text-lg font-bold leading-snug">{postContent.title}</h2>
                  <p className="mb-2 line-clamp-2 text-sm leading-relaxed">{postContent.excerpt}</p>
                  <span className="mt-auto">{meta(post, postContent.readTime)}</span>
                </div>
              </Link>
            );
          })}
        </div>

        <Prose className="mx-auto text-center text-sm">
          <p>{content.footerText}</p>
          <p>
            <Link href={`/${locale}/education`}>{educationCta[locale] || educationCta.en}</Link>
          </p>
        </Prose>
      </LandingPage>
    </div>
  );
}
