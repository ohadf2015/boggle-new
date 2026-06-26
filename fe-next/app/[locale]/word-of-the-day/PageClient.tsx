'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import AutoHideHeader from '@/components/AutoHideHeader';
import { InlineBannerAd } from "@/components/ads";
import type { WordEntry } from './content';

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-500 text-white',
  medium: 'bg-neo-orange text-white',
  hard: 'bg-neo-pink text-white',
};

const difficultyLabels: Record<string, Record<string, string>> = {
  easy: { en: 'Easy', he: 'קל', sv: 'Latt', ja: '簡単', es: 'Facil' },
  medium: { en: 'Medium', he: 'בינוני', sv: 'Medel', ja: '中級', es: 'Medio' },
  hard: { en: 'Hard', he: 'קשה', sv: 'Svar', ja: '難しい', es: 'Dificil' },
};

const sectionLabels: Record<string, Record<string, string>> = {
  wordOfTheDay: { en: 'Word of the Day', he: 'המילה היומית', sv: 'Dagens Ord', ja: '今日の言葉', es: 'Palabra del Dia' },
  definition: { en: 'Definition', he: 'הגדרה', sv: 'Definition', ja: '定義', es: 'Definicion' },
  etymology: { en: 'Etymology', he: 'אטימולוגיה', sv: 'Etymologi', ja: '語源', es: 'Etimologia' },
  example: { en: 'Example', he: 'דוגמה', sv: 'Exempel', ja: '例文', es: 'Ejemplo' },
  funFact: { en: 'Fun Fact', he: 'עובדה מעניינת', sv: 'Roligt Fakta', ja: '豆知識', es: 'Dato Curioso' },
  previousWords: { en: 'Previous Words', he: 'מילים קודמות', sv: 'Tidigare Ord', ja: '過去の言葉', es: 'Palabras Anteriores' },
  practiceNow: { en: 'Practice this word in LexiClash', he: 'תרגלו מילה זו ב-LexiClash', sv: 'Ova detta ord i LexiClash', ja: 'LexiClashでこの言葉を練習', es: 'Practica esta palabra en LexiClash' },
  playNow: { en: 'Found a great word? Play LexiClash now!', he: 'מצאתם מילה מעולה? שחקו עכשיו!', sv: 'Hittade du ett bra ord? Spela LexiClash nu!', ja: '素敵な言葉を見つけた？今すぐプレイ！', es: 'Encontraste una gran palabra? Juega ahora!' },
  share: { en: 'Share', he: 'שתפו', sv: 'Dela', ja: 'シェア', es: 'Compartir' },
  copied: { en: 'Copied!', he: 'הועתק!', sv: 'Kopierat!', ja: 'コピー済み！', es: 'Copiado!' },
  partOfSpeech: { en: 'Part of Speech', he: 'חלק דיבור', sv: 'Ordklass', ja: '品詞', es: 'Categoria' },
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

  return (
    <>
      <AutoHideHeader />
      <main className="min-h-dvh bg-neo-navy text-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {/* Page Title */}
          <m.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="font-neo-display text-3xl sm:text-4xl font-bold text-center text-neo-yellow mb-8"
          >
            {label('wordOfTheDay', lang)}
          </m.h1>

          {/* Today's Word Card */}
          <m.article
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="border-3 border-neo-black shadow-hard rounded-neo bg-neo-navy-light p-6 sm:p-8 mb-6"
            aria-label={todayWord.word}
          >
            {/* Word + Badges */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h2
                data-speakable="true"
                className="font-neo-display text-4xl sm:text-5xl font-black text-neo-cyan break-all"
              >
                {todayWord.word}
              </h2>
              <span className={cn('px-2 py-0.5 rounded-neo text-xs font-bold uppercase border-2 border-neo-black', difficultyColors[todayWord.difficulty])}>
                {difficultyLabels[todayWord.difficulty]?.[lang] || todayWord.difficulty}
              </span>
              <span className="px-2 py-0.5 rounded-neo text-xs font-bold bg-neo-navy-elevated text-neo-white border-2 border-neo-black">
                {todayWord.partOfSpeech}
              </span>
            </div>

            {/* Definition */}
            <section className="mb-4">
              <h3 className="font-neo-display text-sm font-bold text-neo-yellow uppercase tracking-wide mb-1">
                {label('definition', lang)}
              </h3>
              <p data-speakable="true" className="text-lg text-neo-white leading-relaxed">
                {todayWord.definition}
              </p>
            </section>

            {/* Etymology */}
            <section className="mb-4">
              <h3 className="font-neo-display text-sm font-bold text-neo-yellow uppercase tracking-wide mb-1">
                {label('etymology', lang)}
              </h3>
              <p data-speakable="true" className="text-neo-white leading-relaxed">
                {todayWord.etymology}
              </p>
            </section>

            {/* Example */}
            <section className="mb-4">
              <h3 className="font-neo-display text-sm font-bold text-neo-yellow uppercase tracking-wide mb-1">
                {label('example', lang)}
              </h3>
              <blockquote
                data-speakable="true"
                className="border-s-4 border-neo-cyan ps-4 italic text-neo-white"
              >
                {todayWord.example}
              </blockquote>
            </section>

            {/* Fun Fact */}
            <section className="mb-6 bg-neo-navy-elevated/50 border-2 border-neo-black rounded-neo p-4">
              <h3 className="font-neo-display text-sm font-bold text-neo-pink uppercase tracking-wide mb-1">
                {label('funFact', lang)}
              </h3>
              <p data-speakable="true" className="text-neo-white">
                {todayWord.funFact}
              </p>
            </section>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/${lang}/singleplayer`}
                className="inline-flex items-center px-5 py-2.5 font-neo-display font-bold text-sm uppercase border-3 border-neo-black rounded-neo bg-neo-yellow text-neo-black shadow-hard hover:shadow-hard-pressed hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-100"
              >
                {label('practiceNow', lang)}
              </Link>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center px-5 py-2.5 font-neo-display font-bold text-sm uppercase border-3 border-neo-black rounded-neo bg-neo-cyan text-neo-black shadow-hard hover:shadow-hard-pressed hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-100"
              >
                {copied ? label('copied', lang) : label('share', lang)}
              </button>
            </div>
          </m.article>

          {/* Ad between sections */}
          <InlineBannerAd webZone="content-page" className="mb-6" />

          {/* Previous Words */}
          <section>
            <h2 className="font-neo-display text-2xl font-bold text-neo-yellow mb-4">
              {label('previousWords', lang)}
            </h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pe-1">
              {previousWords.map((word, i) => (
                <m.div
                  key={word.dateKey}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 * i }}
                  className="border-3 border-neo-black shadow-hard-sm rounded-neo bg-neo-navy-light p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-neo-display text-xl font-black text-neo-cyan">
                      {word.word}
                    </span>
                    <span className={cn('px-1.5 py-0.5 rounded-neo text-[10px] font-bold uppercase border border-neo-black', difficultyColors[word.difficulty])}>
                      {difficultyLabels[word.difficulty]?.[lang] || word.difficulty}
                    </span>
                    <span className="text-xs text-neo-white ms-auto">{word.dateKey}</span>
                  </div>
                  <p className="text-sm text-neo-white">{word.definition}</p>
                </m.div>
              ))}
            </div>
          </section>

          {/* Ad after previous words */}
          <InlineBannerAd webZone="content-page" className="my-6" />

          {/* CTA */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-8"
          >
            <Link
              href={`/${lang}/singleplayer`}
              className="inline-flex items-center px-8 py-3 font-neo-display font-bold text-lg uppercase border-3 border-neo-black rounded-neo bg-neo-pink text-white shadow-hard hover:shadow-hard-pressed hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-100"
            >
              {label('playNow', lang)}
            </Link>
          </m.div>
        </div>
      </main>
    </>
  );
}
