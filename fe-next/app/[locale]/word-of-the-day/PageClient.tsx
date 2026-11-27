'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import AutoHideHeader from '@/components/AutoHideHeader';
import { InlineBannerAd } from "@/components/ads";
import { LandingButton, LandingPage, landingButtonClass } from '@/components/landing/kit';
import { buildEmbedSnippet } from '../embed/word-of-the-day/embedSnippet';
import type { WordEntry } from './content';

const PAPER = 'rounded-neo-lg border-3 border-neo-black bg-neo-cream text-neo-black shadow-hard-xl';

const difficultyColors: Record<string, string> = {
  easy: 'bg-neo-lime text-neo-black',
  medium: 'bg-neo-orange text-neo-black',
  hard: 'bg-neo-pink text-neo-black',
};

const difficultyLabels: Record<string, Record<string, string>> = {
  easy: { en: 'Easy', he: 'קל', sv: 'Latt', ja: '簡単', es: 'Facil', ru: 'Легко' },
  medium: { en: 'Medium', he: 'בינוני', sv: 'Medel', ja: '中級', es: 'Medio', ru: 'Средне' },
  hard: { en: 'Hard', he: 'קשה', sv: 'Svar', ja: '難しい', es: 'Dificil', ru: 'Сложно' },
};

const sectionLabels: Record<string, Record<string, string>> = {
  wordOfTheDay: { en: 'Word of the Day', he: 'המילה היומית', sv: 'Dagens Ord', ja: '今日の言葉', es: 'Palabra del Dia', ru: 'Слово дня' },
  definition: { en: 'Definition', he: 'הגדרה', sv: 'Definition', ja: '定義', es: 'Definicion', ru: 'Значение' },
  etymology: { en: 'Etymology', he: 'אטימולוגיה', sv: 'Etymologi', ja: '語源', es: 'Etimologia', ru: 'Этимология' },
  example: { en: 'Example', he: 'דוגמה', sv: 'Exempel', ja: '例文', es: 'Ejemplo', ru: 'Пример' },
  funFact: { en: 'Fun Fact', he: 'עובדה מעניינת', sv: 'Roligt Fakta', ja: '豆知識', es: 'Dato Curioso', ru: 'Интересный факт' },
  previousWords: { en: 'Previous Words', he: 'מילים קודמות', sv: 'Tidigare Ord', ja: '過去の言葉', es: 'Palabras Anteriores', ru: 'Прошлые слова' },
  practiceNow: { en: 'Practice this word in LexiClash', he: 'תרגלו מילה זו ב-LexiClash', sv: 'Ova detta ord i LexiClash', ja: 'LexiClashでこの言葉を練習', es: 'Practica esta palabra en LexiClash', ru: 'Потренируйте это слово в LexiClash' },
  playNow: { en: 'Found a great word? Play LexiClash now!', he: 'מצאתם מילה מעולה? שחקו עכשיו!', sv: 'Hittade du ett bra ord? Spela LexiClash nu!', ja: '素敵な言葉を見つけた？今すぐプレイ！', es: 'Encontraste una gran palabra? Juega ahora!', ru: 'Нашли отличное слово? Играйте в LexiClash прямо сейчас!' },
  share: { en: 'Share', he: 'שתפו', sv: 'Dela', ja: 'シェア', es: 'Compartir', ru: 'Поделиться' },
  copied: { en: 'Copied!', he: 'הועתק!', sv: 'Kopierat!', ja: 'コピー済み！', es: 'Copiado!', ru: 'Скопировано!' },
  partOfSpeech: { en: 'Part of Speech', he: 'חלק דיבור', sv: 'Ordklass', ja: '品詞', es: 'Categoria', ru: 'Часть речи' },
  embedWidget: { en: 'Embed this widget', he: 'הטמיעו את הווידג\'ט', sv: 'Bädda in widgeten', ja: 'ウィジェットを埋め込む', es: 'Inserta este widget', ru: 'Встроить виджет' },
  embedSnippet: { en: 'Copy the code below to embed this Word of the Day widget on your website', he: 'העתיקו את הקוד הבא להטמעת הווידג\'ט על האתר שלכם', sv: 'Kopiera koden nedan för att bädda in denna widget på din webbplats', ja: 'このウィジェットをあなたのWebサイトに埋め込むには、下のコードをコピーしてください', es: 'Copie el código a continuación para insertar este widget en su sitio web', ru: 'Скопируйте код ниже, чтобы встроить виджет «Слово дня» на свой сайт' },
  embedCopyButton: { en: 'Copy Code', he: 'העתק קוד', sv: 'Kopiera Kod', ja: 'コードをコピー', es: 'Copiar Código', ru: 'Скопировать код' },
};

function label(key: string, locale: string): string {
  return sectionLabels[key]?.[locale] || sectionLabels[key]?.en || key;
}

interface Props {
  allWords: WordEntry[];
  featuredWord?: WordEntry;
}

export default function WordOfTheDayClient({ allWords, featuredWord }: Props) {
  const { locale } = useParams<{ locale: string }>();
  const { language } = useLanguage();
  const lang = locale || language || 'en';
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);

  const todayWord = useMemo(() => {
    if (featuredWord) return featuredWord;
    const today = new Date().toISOString().slice(0, 10);
    return allWords.find((w) => w.dateKey === today) || allWords[0];
  }, [allWords, featuredWord]);
  const previousWords = useMemo(
    () => allWords.filter((w) => w.dateKey !== todayWord.dateKey).slice(0, 7),
    [allWords, todayWord.dateKey],
  );

  const handleShare = useCallback(async () => {
    const text = `${label('wordOfTheDay', lang)}: ${todayWord.word}\n${todayWord.definition}\n\nhttps://www.lexiclash.live/${lang}/word-of-the-day`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  }, [todayWord, lang]);

  const handleEmbedCopy = useCallback(async () => {
    const snippet = buildEmbedSnippet(lang);
    try {
      await navigator.clipboard.writeText(snippet);
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  }, [lang]);

  const h3 = 'mb-1 font-neo-display text-sm font-bold uppercase tracking-wide text-neo-black/70';

  return (
    <div className="min-h-dvh bg-neo-navy">
      <AutoHideHeader />
      <LandingPage locale={lang} topBar={false}>
        <div className="grid items-start gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-x-10 lg:pt-6">
          <div className="flex flex-col gap-6">
            <h1 className="font-neo-display text-[2rem] font-bold leading-[1.1] sm:text-5xl">{label('wordOfTheDay', lang)}</h1>

            <article className={cn(PAPER, 'flex flex-col gap-5 p-5 sm:p-8')} aria-label={todayWord.word}>
              <div className="flex flex-wrap items-center gap-3">
                <h2 data-speakable="true" className="break-all font-neo-display text-5xl font-bold sm:text-6xl">
                  {todayWord.word}
                </h2>
                <span className={cn('rounded-full border-2 border-neo-black px-3 py-0.5 text-xs font-bold uppercase', difficultyColors[todayWord.difficulty])}>
                  {difficultyLabels[todayWord.difficulty]?.[lang] || todayWord.difficulty}
                </span>
                <span className="rounded-full border-2 border-neo-black bg-neo-white px-3 py-0.5 text-xs font-bold">
                  {todayWord.partOfSpeech}
                </span>
              </div>

              <section>
                <h3 className={h3}>{label('definition', lang)}</h3>
                <p data-speakable="true" className="text-xl leading-relaxed">{todayWord.definition}</p>
              </section>

              <section>
                <h3 className={h3}>{label('etymology', lang)}</h3>
                <p data-speakable="true" className="leading-relaxed">{todayWord.etymology}</p>
              </section>

              <section>
                <h3 className={h3}>{label('example', lang)}</h3>
                <blockquote data-speakable="true" className="border-s-4 border-neo-pink ps-4 italic">
                  {todayWord.example}
                </blockquote>
              </section>

              <section className="rounded-neo border-2 border-neo-black bg-neo-yellow p-4">
                <h3 className="mb-1 font-neo-display text-sm font-bold uppercase tracking-wide">{label('funFact', lang)}</h3>
                <p data-speakable="true">{todayWord.funFact}</p>
              </section>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <LandingButton href={`/${lang}/quick-play`}>{label('practiceNow', lang)}</LandingButton>
                <button type="button" onClick={handleShare} className={landingButtonClass('secondary')}>
                  {copied ? label('copied', lang) : label('share', lang)}
                </button>
              </div>
            </article>
          </div>

          <section className="flex flex-col gap-4 lg:pt-[4.5rem]">
            <h2 className="font-neo-display text-2xl font-bold">{label('previousWords', lang)}</h2>
            <div className="flex flex-col gap-3">
              {previousWords.map((word) => (
                <div key={word.dateKey} className={cn(PAPER, 'p-4 shadow-hard-lg')}>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-neo-display text-xl font-bold">{word.word}</span>
                    <span className={cn('rounded-full border border-neo-black px-1.5 py-0.5 text-[10px] font-bold uppercase', difficultyColors[word.difficulty])}>
                      {difficultyLabels[word.difficulty]?.[lang] || word.difficulty}
                    </span>
                    <span className="ms-auto text-xs text-neo-black/70">{word.dateKey}</span>
                  </div>
                  <p className="text-sm">{word.definition}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <InlineBannerAd webZone="content-page" />

        <section className="flex max-w-3xl flex-col gap-3">
          <h2 className="font-neo-display text-xl font-bold">{label('embedWidget', lang)}</h2>
          <p className="text-sm text-neo-white/80">{label('embedSnippet', lang)}</p>
          <textarea
            readOnly
            value={buildEmbedSnippet(lang)}
            className="w-full resize-none rounded-neo border-2 border-neo-black bg-neo-navy-elevated p-3 font-mono text-xs text-neo-cream outline-none"
            rows={4}
          />
          <button type="button" onClick={handleEmbedCopy} className={cn(landingButtonClass('secondary'), 'min-h-11 self-start px-4 py-1.5 text-sm')}>
            {embedCopied ? label('copied', lang) : label('embedCopyButton', lang)}
          </button>
        </section>

        <InlineBannerAd webZone="content-page" />

        <div className="flex justify-center">
          <LandingButton href={`/${lang}/quick-play`} variant="secondary">{label('playNow', lang)}</LandingButton>
        </div>
      </LandingPage>
    </div>
  );
}
