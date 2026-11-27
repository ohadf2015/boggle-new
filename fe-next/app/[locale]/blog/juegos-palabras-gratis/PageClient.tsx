'use client';

import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { RelatedArticles } from '@/components/blog/RelatedArticles';
import { contentByLocale } from './content';
import { AuthorBioCard } from '@/components/blog/AuthorBioCard';
import { BlogPostLayout, BlogSections } from '@/components/blog/BlogPostLayout';

export default function JuegosPalabrasGratisPageClient(): React.ReactElement {
  const { language } = useLanguage();
  const params = useParams();
  const locale = (params.locale as string) || language;

  const content = contentByLocale[locale] || contentByLocale.es;
  const relatedHeadingByLocale: Record<string, string> = {
    en: 'You Might Also Like',
    he: 'אולי יעניין אותך גם',
    sv: 'Du kanske också gillar',
    ja: 'こちらもおすすめ',
    es: 'También te puede interesar',
  };
  const relatedHeading = relatedHeadingByLocale[locale] || relatedHeadingByLocale.es;
  const relatedArticlesData = [
    { slug: 'alternativas-a-scrabble', title: 'Alternativas a Scrabble', excerpt: '', readTime: '11 min', category: 'Comparativa', image: '' },
    { slug: 'free-word-games-online', title: 'Free Word Games Online: The Honest Guide', excerpt: '', readTime: '11 min read', category: 'Guide', image: '' },
    { slug: 'best-boggle-alternatives-2026', title: 'Best Boggle Alternatives in 2026', excerpt: '', readTime: '10 min read', category: 'Reviews', image: '' },
    { slug: 'boggle-vs-scrabble', title: 'Boggle vs Scrabble: The Honest Showdown', excerpt: '', readTime: '12 min read', category: 'Versus', image: '' },
    { slug: 'multiplayer-word-games-social', title: 'Multiplayer Word Games and Social Play', excerpt: '', readTime: '8 min read', category: 'Social', image: '' },
    { slug: 'daily-challenge-strategies', title: '7 Proven Daily Challenge Strategies', excerpt: '', readTime: '7 min read', category: 'Strategy', image: '' },
    { slug: '10-surprising-benefits-word-games', title: '10 Surprising Benefits of Playing Word Games Daily', excerpt: '', readTime: '5 min read', category: 'Research', image: '' },
    { slug: 'improve-word-game-skills', title: 'How to Improve Your Word Game Skills', excerpt: '', readTime: '8 min read', category: 'Strategy', image: '' },
    { slug: 'why-word-games-are-addictive', title: 'Why You Can\'t Stop Playing Word Games', excerpt: '', readTime: '11 min read', category: 'Psychology', image: '' },
  ];

  return (
    <BlogPostLayout
      locale={locale}
      backLabel={content.backToBlog}
      category={content.category}
      categoryTone="lime"
      title={content.title}
      subtitle={content.subtitle}
      date="2026-05-11"
      readTime={content.readTime}
      image={{ src: "/images/blog/juegos-palabras-gratis.jpg", alt: "Una pantalla de celular mostrando un juego de palabras en español con la palabra del día" }}
      ctas={[
        { href: `/${locale}/daily`, label: content.playDaily },
        { href: `/${locale}/multiplayer`, label: content.startPracticing },
      ]}
      after={
        <>
          <AuthorBioCard />
          <RelatedArticles
            currentSlug="juegos-palabras-gratis"
            locale={locale}
            heading={relatedHeading}
            articles={relatedArticlesData}
          />
        </>
      }
    >
      <BlogSections sections={content.sections} />
    </BlogPostLayout>
  );
}
