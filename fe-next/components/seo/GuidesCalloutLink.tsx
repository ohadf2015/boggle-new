import Link from 'next/link';

interface Props {
  locale: string;
}

type LocaleKey = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';

const STRATEGY_GUIDES = [
  { href: '/en/guides/classic-strategy', label: { en: 'Classic strategy', he: 'אסטרטגיית קלאסי', sv: 'Klassisk strategi', ja: 'クラシック攻略', es: 'Estrategia Clásico', ru: 'Стратегия для Классики' } },
  { href: '/en/guides/blast-strategy',   label: { en: 'Blast strategy',   he: 'אסטרטגיית בלאסט', sv: 'Blast-strategi',   ja: 'ブラスト攻略',   es: 'Estrategia Blast', ru: 'Стратегия для Blast' } },
  { href: '/en/guides/word-hunt-strategy', label: { en: 'Word Hunt strategy', he: 'אסטרטגיית ציד מילים', sv: 'Word Hunt-strategi', ja: 'ワードハント攻略', es: 'Estrategia Word Hunt', ru: 'Стратегия для Word Hunt' } },
] as const;

const CONTENT: Record<LocaleKey, { title: string; tagline: string; cta: string }> = {
  en: {
    title: 'Want to score higher?',
    tagline: 'In-depth guides for Classic, Blast, and Word Hunt — written from real game experience.',
    cta: 'See all guides →',
  },
  he: {
    title: 'רוצים לשפר את הניקוד?',
    tagline: 'מדריכי אסטרטגיה לקלאסי, בלאסט וציד מילים.',
    cta: 'לכל המדריכים ←',
  },
  sv: {
    title: 'Vill du bli bättre?',
    tagline: 'Strategiguider för Klassiskt, Blast och Word Hunt.',
    cta: 'Se alla guider →',
  },
  ja: {
    title: 'もっとスコアを上げたい？',
    tagline: 'クラシック、ブラスト、ワードハントの攻略ガイド。',
    cta: 'すべてのガイドを見る →',
  },
  es: {
    title: '¿Quieres mejorar tu puntuación?',
    tagline: 'Guías de estrategia para Clásico, Blast y Word Hunt.',
    cta: 'Ver todas las guías →',
  },
  ru: {
    title: 'Хотите набирать больше очков?',
    tagline: 'Подробные гайды по режимам Классика, Blast и Word Hunt.',
    cta: 'Все гайды →',
  },
};

export function GuidesCalloutLink({ locale }: Props) {
  const lang = (locale in CONTENT ? locale : 'en') as LocaleKey;
  const { title, tagline, cta } = CONTENT[lang];
  return (
    <aside className="my-8 rounded-neo-lg border-3 border-neo-black bg-neo-cream p-5 text-neo-black shadow-hard-xl">
      <h3 className="font-neo-display text-lg font-black text-neo-black">
        {title}
      </h3>
      <p className="mt-2 text-sm text-neo-black/80">{tagline}</p>
      <ul className="mt-3 flex flex-wrap gap-2" role="list">
        {STRATEGY_GUIDES.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="inline-flex min-h-11 items-center rounded-full border-2 border-neo-black bg-neo-lime px-3 py-1 font-neo-display text-xs font-bold text-neo-black shadow-hard-lg motion-safe:transition-transform motion-safe:hover:-translate-y-0.5"
            >
              {label[lang]}
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={`/${locale}/guides`}
        className="mt-3 inline-block font-neo-display text-xs font-black uppercase tracking-widest text-neo-black underline decoration-neo-pink decoration-2 underline-offset-4"
      >
        {cta}
      </Link>
    </aside>
  );
}
