import Link from 'next/link';

interface Props {
  locale: string;
}

type LocaleKey = 'en' | 'he' | 'sv' | 'ja' | 'es';

const CONTENT: Record<LocaleKey, { title: string; tagline: string; cta: string }> = {
  en: {
    title: 'Want to score higher?',
    tagline: 'In-depth guides for Classic, Blast, and Word Hunt — written from real game experience.',
    cta: 'Read the strategy guides →',
  },
  he: {
    title: 'רוצים לשפר את הניקוד?',
    tagline: 'מדריכי אסטרטגיה לקלאסי, בלאסט וציד מילים.',
    cta: 'לכל המדריכים ←',
  },
  sv: {
    title: 'Vill du bli bättre?',
    tagline: 'Strategiguider för Klassiskt, Blast och Word Hunt.',
    cta: 'Läs strategiguiderna →',
  },
  ja: {
    title: 'もっとスコアを上げたい？',
    tagline: 'クラシック、ブラスト、ワードハントの攻略ガイド。',
    cta: '攻略ガイドを読む →',
  },
  es: {
    title: '¿Quieres mejorar tu puntuación?',
    tagline: 'Guías de estrategia para Clásico, Blast y Word Hunt.',
    cta: 'Ver las guías →',
  },
};

export function GuidesCalloutLink({ locale }: Props) {
  const lang = (locale in CONTENT ? locale : 'en') as LocaleKey;
  const { title, tagline, cta } = CONTENT[lang];
  return (
    <aside className="my-8 rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard">
      <Link href={`/${locale}/guides`} className="block group">
        <h3 className="font-neo-display text-lg font-black text-neo-lime underline decoration-2 underline-offset-4 group-hover:text-neo-white transition-colors">
          {title}
        </h3>
        <p className="mt-2 text-sm text-slate-300">{tagline}</p>
        <span className="mt-3 inline-block font-neo-display text-xs font-black uppercase tracking-widest text-neo-lime group-hover:text-neo-white transition-colors">
          {cta}
        </span>
      </Link>
    </aside>
  );
}
