import Link from 'next/link';

interface Props {
  locale: string;
}

type LocaleKey = 'en' | 'he' | 'sv' | 'ja' | 'es';

const CONTENT: Record<LocaleKey, { title: string; tagline: string; cta: string }> = {
  en: {
    title: 'Teaching this in a real classroom?',
    tagline: 'LexiClash for Schools: free teacher dashboards, no student accounts, live vocabulary rounds your whole class can join with a 6-character code.',
    cta: 'See LexiClash for Schools →',
  },
  he: {
    title: 'מלמדים את זה בכיתה אמיתית?',
    tagline: 'LexiClash לבתי ספר: לוח בקרה חינמי למורים, ללא צורך בחשבון לתלמידים, סבבי אוצר מילים חיים שכל הכיתה מצטרפת אליהם עם קוד בן 6 תווים.',
    cta: 'לצפייה ב-LexiClash לבתי ספר ←',
  },
  sv: {
    title: 'Undervisar du om detta i ett klassrum?',
    tagline: 'LexiClash för skolor: gratis lärarpanel, inga elevkonton, liva ordförrådsrundor hela klassen kan gå med i via en 6-teckenskod.',
    cta: 'Se LexiClash för skolor →',
  },
  ja: {
    title: '実際の教室で教えていますか？',
    tagline: 'LexiClash for Schools：無料の教師用ダッシュボード、生徒アカウント不要、6文字のコードでクラス全員が参加できるライブ語彙ラウンド。',
    cta: 'LexiClash for Schools を見る →',
  },
  es: {
    title: '¿Enseñas esto en un aula real?',
    tagline: 'LexiClash para Escuelas: panel gratuito para profesores, sin cuentas de estudiante, rondas de vocabulario en vivo a las que toda la clase se une con un código de 6 caracteres.',
    cta: 'Ver LexiClash para Escuelas →',
  },
};

export function EducationCalloutLink({ locale }: Props) {
  const lang = (locale in CONTENT ? locale : 'en') as LocaleKey;
  const { title, tagline, cta } = CONTENT[lang];
  return (
    <aside className="my-8 rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard">
      <h3 className="font-neo-display text-lg font-black text-neo-lime">
        {title}
      </h3>
      <p className="mt-2 text-sm text-slate-300">{tagline}</p>
      <Link
        href={`/${locale}/education/for-schools`}
        className="mt-3 inline-block font-neo-display text-xs font-black uppercase tracking-widest text-slate-400 hover:text-neo-white transition-colors"
      >
        {cta}
      </Link>
    </aside>
  );
}
