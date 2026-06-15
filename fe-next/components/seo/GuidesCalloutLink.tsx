import Link from 'next/link';

interface Props {
  locale: string;
}

type LocaleKey = 'en' | 'he' | 'sv' | 'ja' | 'es';

const STRATEGY_GUIDES = [
  { href: '/en/guides/classic-strategy', label: { en: 'Classic strategy', he: 'אסטרטגיית קלאסי', sv: 'Klassisk strategi', ja: 'クラシック攻略', es: 'Estrategia Clásico' } },
  { href: '/en/guides/blast-strategy',   label: { en: 'Blast strategy',   he: 'אסטרטגיית בלאסט', sv: 'Blast-strategi',   ja: 'ブラスト攻略',   es: 'Estrategia Blast'   } },
  { href: '/en/guides/word-hunt-strategy', label: { en: 'Word Hunt strategy', he: 'אסטרטגיית ציד מילים', sv: 'Word Hunt-strategi', ja: 'ワードハント攻略', es: 'Estrategia Word Hunt' } },
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
};

export function GuidesCalloutLink({ locale }: Props) {
  const lang = (locale in CONTENT ? locale : 'en') as LocaleKey;
  const { title, tagline, cta } = CONTENT[lang];
  return (
    <aside className="my-8 rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard">
      <h3 className="font-neo-display text-lg font-black text-neo-lime">
        {title}
      </h3>
      <p className="mt-2 text-sm text-slate-300">{tagline}</p>
      <ul className="mt-3 flex flex-wrap gap-2" role="list">
        {STRATEGY_GUIDES.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="inline-block rounded border border-neo-black bg-neo-navy px-3 py-1 font-neo-display text-xs font-bold text-neo-lime underline-offset-2 hover:bg-neo-lime hover:text-neo-black transition-colors"
            >
              {label[lang]}
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={`/${locale}/guides`}
        className="mt-3 inline-block font-neo-display text-xs font-black uppercase tracking-widest text-slate-400 hover:text-neo-white transition-colors"
      >
        {cta}
      </Link>
    </aside>
  );
}
