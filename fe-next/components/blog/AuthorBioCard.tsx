'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const bioByLocale: Record<string, string> = {
  en: 'Founder and editor-in-chief of LexiClash. 8+ years designing word games and reading cognitive-science research. Every claim in my articles is sourced and fact-checked against peer-reviewed studies — see our editorial policy.',
  he: 'מייסד ועורך ראשי של LexiClash. מעל 8 שנים של עיצוב משחקי מילים וקריאה של מחקר במדעי הקוגניציה. כל טענה במאמרים מתועדת ועוברת בדיקת עובדות מול מחקרים שנסקרו על ידי עמיתים — ראו את מדיניות העריכה.',
  sv: 'Grundare och chefredaktör för LexiClash. 8+ års design av ordspel och läsning av kognitionsforskning. Varje påstående i mina artiklar är källbelagt och faktagranskat mot peer-reviewade studier — se vår redaktionella policy.',
  ja: 'LexiClashの創設者兼編集長。ワードゲーム設計と認知科学の研究を8年以上続けている。記事のすべての主張は査読付き研究から出典が示され、事実確認されている — 編集方針を参照。',
  es: 'Fundador y editor jefe de LexiClash. Más de 8 años diseñando juegos de palabras y leyendo investigación en ciencia cognitiva. Cada afirmación en mis artículos está documentada y verificada contra estudios revisados por pares — consulta nuestra política editorial.',
};

const titleByLocale: Record<string, string> = {
  en: 'Founder & Editor-in-Chief, LexiClash',
  he: 'מייסד ועורך ראשי, LexiClash',
  sv: 'Grundare & Chefredaktör, LexiClash',
  ja: 'LexiClash 創設者兼編集長',
  es: 'Fundador y Editor Jefe, LexiClash',
};

const editorialByLocale: Record<string, string> = {
  en: 'Editorial Policy',
  he: 'מדיניות עריכה',
  sv: 'Redaktionell policy',
  ja: '編集方針',
  es: 'Política editorial',
};

export function AuthorBioCard() {
  const params = useParams();
  const locale = (params.locale as string) || 'en';

  const bio = bioByLocale[locale] || bioByLocale.en;
  const title = titleByLocale[locale] || titleByLocale.en;
  const editorialLabel = editorialByLocale[locale] || editorialByLocale.en;

  return (
    <div className="flex flex-col items-center gap-4 rounded-neo-lg border-3 border-neo-black bg-neo-cream p-5 text-neo-black shadow-hard-xl sm:flex-row sm:items-start">
      <Image
        src="/images/author-ohad.png"
        alt="Ohad Fisher, Founder and Editor-in-Chief of LexiClash"
        width={72}
        height={72}
        className="h-18 w-18 shrink-0 rounded-full border-3 border-neo-black object-cover"
      />

      <div className="flex-1 text-center sm:text-start">
        <Link href={`/${locale}/about/ohad-fisher`} className="font-neo-display text-lg font-bold hover:underline">
          Ohad Fisher
        </Link>
        <p className="mt-0.5 text-xs font-bold text-neo-black/70">{title}</p>
        <p className="mt-2 text-sm leading-relaxed">{bio}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 sm:justify-start">
          <Link href={`/${locale}/editorial-policy`} className="text-sm font-bold underline decoration-neo-pink decoration-2 underline-offset-2">
            {editorialLabel}
          </Link>
          <a href="mailto:editor@lexiclash.live" className="text-sm font-bold underline decoration-neo-pink decoration-2 underline-offset-2">
            editor@lexiclash.live
          </a>
        </div>
      </div>
    </div>
  );
}
