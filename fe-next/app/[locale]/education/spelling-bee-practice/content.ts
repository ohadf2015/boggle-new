export type LocaleContent = {
  metaTitle: string;
  metaDescription: string;
};

export const EDUCATION_LOCALES = ['en', 'he', 'es', 'sv', 'ja'] as const;
export type EducationLocale = (typeof EDUCATION_LOCALES)[number];

const content: Record<EducationLocale, LocaleContent> = {
  en: {
    metaTitle: 'Spelling Bee Practice Online — Free Word Games for Spelling Champions | LexiClash',
    metaDescription: 'Free online spelling bee practice through word games. Boggle-style grids, anagram drills, word wheels, and 1v1 spelling duels. No signup, no app — just open the browser and start practicing for Scripps, regional bees, or classroom spelling tests.',
  },
  he: {
    metaTitle: 'תרגול איות בחינם — משחקי מילים לאלופי האיות | LexiClash',
    metaDescription: 'תרגול איות בחינם דרך משחקים: Boggle, אנגרמות, גלגל מילים ודו־קרבות. בלי הרשמה, בלי אפליקציה — רק דפדפן.',
  },
  es: {
    metaTitle: 'Práctica de Ortografía Online — Juegos Gratis | LexiClash',
    metaDescription: 'Práctica de ortografía gratis a través de juegos. Boggle, anagramas, ruedas, duelos. Sin registro, sin app — solo navegador.',
  },
  sv: {
    metaTitle: 'Stavningspraktik Online — Gratis Ordspel | LexiClash',
    metaDescription: 'Gratis stavningspraktik genom ordspel. Boggle, anagram, hjul, dueller. Ingen registrering, ingen app — bara webbläsare.',
  },
  ja: {
    metaTitle: 'スペリング練習オンライン — 無料単語ゲーム | LexiClash',
    metaDescription: '無料のスペリング練習。Boggle、アナグラム、ホイール、デュエル。登録なし、アプリなし — ブラウザだけ。',
  },
};

export function getSpellingBeeContent(locale: string): LocaleContent {
  const normalizedLocale = locale.toLowerCase().split('-')[0];

  if (normalizedLocale === 'en' || !EDUCATION_LOCALES.includes(normalizedLocale as EducationLocale)) {
    return content.en;
  }

  return content[normalizedLocale as EducationLocale];
}
