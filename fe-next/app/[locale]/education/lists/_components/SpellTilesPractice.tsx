'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Delete, Eye, Star, Volume2 } from 'lucide-react';
import { cancelSpeech, speakWord } from '@/lib/speech/textToSpeech';
import { trackGrowthEvent } from '@/utils/growthTracking';
import {
  buildPuzzle,
  emptyAnswer,
  gradeAnswer,
  isFull,
  placeTile,
  removeAt,
  removeLast,
  speechLang,
  tileForKey,
  wordGroups,
  type Answer,
  type Puzzle,
} from './spellPuzzle';
import { EndCard, WelcomeCard, fill, type TeacherCta } from './SpellTilesCards';

export interface SpellLabels {
  welcomeTitle: string;
  welcomeBody: string;
  wordCount: string;
  start: string;
  hear: string;
  peek: string;
  noVoice: string;
  listen: string;
  erase: string;
  correct: string;
  wrong: string;
  shown: string;
  stars: string;
  progress: string;
  endTitle: string;
  endAccuracy: string;
  endStars: string;
  cheerTop: string;
  cheerMid: string;
  cheerLow: string;
  again: string;
  close: string;
  teacherTitle: string;
  teacherBody: string;
  teacherCta: string;
}

export interface SpellWord {
  /** The spelling the child builds (niqqud-free for Hebrew). */
  word: string;
  /** What the voice reads, when it differs from `word`. */
  say?: string;
  definition: string;
}

interface Props {
  locale: string;
  title: string;
  lang: string;
  words: SpellWord[];
  labels: SpellLabels;
  teacherCta: TeacherCta;
  onClose: () => void;
  rand?: () => number;
}

const PEEK_MS = 2500;
const CORRECT_MS = 1100;
const WRONG_MS = 1600;
const RTL_LANGS = new Set(['he', 'ar']);

function useVoice(lang: string): boolean {
  const [has, setHas] = useState(false);
  useEffect(() => {
    const ss = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    if (!ss) return;
    const prefix = speechLang(lang).split('-')[0];
    const check = () => setHas(ss.getVoices().some((v) => v.lang.toLowerCase().startsWith(prefix)));
    check();
    ss.addEventListener?.('voiceschanged', check);
    return () => ss.removeEventListener?.('voiceschanged', check);
  }, [lang]);
  return has;
}

export function SpellTilesPractice({ locale, title, lang, words, labels, teacherCta, onClose, rand }: Props) {
  const hasVoice = useVoice(lang);
  const [phase, setPhase] = useState<'welcome' | 'play' | 'end'>('welcome');
  const [index, setIndex] = useState(0);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [answer, setAnswer] = useState<Answer>([]);
  const [marks, setMarks] = useState<boolean[] | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [misses, setMisses] = useState(0);
  const [peek, setPeek] = useState(false);
  const [stars, setStars] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [gain, setGain] = useState(0);
  const [lastTry, setLastTry] = useState<Array<{ char: string; right: boolean; fixed: boolean }> | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const progress = useRef({ index: 0, firstTry: 0 });

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      cancelSpeech();
    },
    [],
  );

  const say = useCallback(
    (i: number) => {
      const w = words[i];
      if (w && hasVoice) void speakWord(w.say ?? w.word, speechLang(lang));
    },
    [words, hasVoice, lang],
  );

  const showWord = useCallback(() => {
    setPeek(true);
    later(() => setPeek(false), PEEK_MS);
  }, [later]);

  const beginWord = useCallback(
    (i: number) => {
      const p = buildPuzzle(words[i].word, rand);
      progress.current.index = i;
      setIndex(i);
      setPuzzle(p);
      setAnswer(emptyAnswer(p));
      setMarks(null);
      setFeedback(null);
      setMisses(0);
      setLastTry(null);
      setPeek(false);
      say(i);
      if (i === 0 || !hasVoice) showWord();
    },
    [words, rand, say, hasVoice, showWord],
  );

  const start = () => {
    clearTimers();
    progress.current = { index: 0, firstTry: 0 };
    setStars(0);
    setFirstTry(0);
    setPhase('play');
    beginWord(0);
    trackGrowthEvent('landing_cta_clicked', { cta: 'word_list_practice_started', lang, words: words.length });
  };

  const advance = useCallback(() => {
    const next = progress.current.index + 1;
    if (next < words.length) return beginWord(next);
    setPhase('end');
    const accuracy = Math.round((progress.current.firstTry / words.length) * 100);
    trackGrowthEvent('landing_cta_clicked', { cta: 'word_list_practice_finished', lang, words: words.length, accuracy });
  }, [words.length, beginWord, lang]);

  const commit = useCallback(
    (next: Answer) => {
      if (!puzzle) return;
      setAnswer(next);
      if (!isFull(puzzle, next)) return;
      const m = gradeAnswer(puzzle, next);
      setMarks(m);
      if (m.every(Boolean)) {
        const earned = misses === 0 ? 3 : 1;
        setFeedback('correct');
        setGain(earned);
        setStars((s) => s + earned);
        if (misses === 0) {
          progress.current.firstTry += 1;
          setFirstTry((f) => f + 1);
        }
        later(advance, CORRECT_MS);
        return;
      }
      setFeedback('wrong');
      setMisses((x) => x + 1);
      const tried = puzzle.slots.map((sl, i) => ({
        char: sl.fixed ? sl.char : (puzzle.tiles.find((t) => t.id === next[i])?.char ?? ''),
        right: m[i],
        fixed: sl.fixed,
      }));
      later(() => {
        setLastTry(tried);
        setAnswer(emptyAnswer(puzzle));
        setMarks(null);
        setFeedback(null);
      }, WRONG_MS);
    },
    [puzzle, misses, later, advance],
  );

  const locked = feedback !== null;
  useEffect(() => {
    if (phase !== 'play' || !puzzle || locked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Backspace') {
        e.preventDefault();
        commit(removeLast(puzzle, answer));
        return;
      }
      const id = tileForKey(puzzle, answer, e.key);
      if (id != null) commit(placeTile(puzzle, answer, id));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, puzzle, answer, locked, commit]);

  if (phase === 'welcome') return <WelcomeCard title={title} count={words.length} labels={labels} locale={locale} onStart={start} />;
  if (phase === 'end' || !puzzle)
    return (
      <EndCard
        labels={labels}
        locale={locale}
        firstTry={firstTry}
        total={words.length}
        stars={stars}
        teacherCta={teacherCta}
        onAgain={start}
        onClose={onClose}
      />
    );

  const w = words[index];
  const dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';
  const groups = wordGroups(puzzle);
  const n = Math.max(...groups.map((g) => g.length));
  const dense = n > 10;
  const denseTiles = puzzle.tiles.length > 12;
  const gap = dense ? 0.125 : 0.375;
  const slotStyle = { width: `min(4.5rem, calc((100cqw - ${(n - 1) * gap}rem) / ${n}))`, fontSize: `min(2.5rem, calc(60cqw / ${n}))` };
  const revealed = peek || misses >= 2;
  const tileChar = (id: number | null) => puzzle.tiles.find((t) => t.id === id)?.char ?? '';

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="shrink-0 font-neo-display text-sm font-black uppercase tracking-widest text-neo-white/80">
          {fill(labels.progress, { n: index + 1, total: words.length }, locale)}
        </span>
        <span className="h-3 flex-1 overflow-hidden rounded-full border-2 border-neo-cream/40 bg-neo-navy-light" aria-hidden>
          <span className="block h-full bg-neo-lime" style={{ width: `${(index / words.length) * 100}%` }} />
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-sm font-black text-neo-navy" aria-label={labels.stars}>
          <Star className="h-4 w-4" fill="currentColor" aria-hidden />
          <span data-stars>{stars}</span>
        </span>
      </div>

      <section className="rounded-neo-lg border-4 border-neo-black bg-neo-cream p-4 text-center text-neo-navy shadow-hard-lg">
        <div className="flex items-center justify-center gap-3">
          {hasVoice && (
            <button
              type="button"
              onClick={() => say(index)}
              aria-label={labels.hear}
              className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-neo-black bg-neo-cyan shadow-hard transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-purple motion-reduce:transition-none"
            >
              <Volume2 className="h-8 w-8 rtl:-scale-x-100" aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={showWord}
            aria-label={labels.peek}
            className="flex h-12 w-12 items-center justify-center rounded-full border-3 border-neo-black bg-neo-white shadow-hard-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-purple"
          >
            <Eye className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className="mt-3 min-h-[2.5rem] font-neo-display text-3xl font-black leading-tight" lang={lang} dir={dir}>
          {revealed ? <span data-reveal>{w.word}</span> : <span className="text-lg text-neo-navy/60">{labels.listen}</span>}
        </p>
        {w.definition && (
          <p className="mx-auto mt-1 max-w-lg text-sm font-bold text-neo-navy/75" lang={lang} dir="auto">
            {w.definition}
          </p>
        )}
        {!hasVoice && <p className="mt-2 text-xs font-bold text-neo-navy/60">{labels.noVoice}</p>}
      </section>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 [container-type:inline-size]">
        {lastTry && !feedback && (
          <div data-last-try dir={dir} lang={lang} className="flex flex-wrap justify-center gap-1" aria-hidden>
            {lastTry.map((c, i) =>
              c.fixed ? (
                <span key={i} className="w-3" />
              ) : (
                <span
                  key={i}
                  data-mark={c.right ? 'right' : 'wrong'}
                  className={`flex h-9 w-8 items-center justify-center rounded-neo border-2 border-neo-black font-neo-display text-lg font-black text-neo-navy ${c.right ? 'bg-neo-lime' : 'bg-neo-orange'}`}
                >
                  {c.char}
                </span>
              ),
            )}
          </div>
        )}
        <div data-slot-row dir={dir} lang={lang} className="flex w-full flex-wrap justify-center gap-x-5 gap-y-2">
          {groups.map((g) => (
            <span key={g[0]} className="flex" style={{ gap: `${gap}rem` }}>
              {g.map((i) => {
                const s = puzzle.slots[i];
                if (s.fixed)
                  return (
                    <span key={i} data-fixed className="flex items-end justify-center font-neo-display font-black text-neo-white" style={slotStyle}>
                      {s.char}
                    </span>
                  );
                const mark = marks ? (marks[i] ? 'right' : 'wrong') : undefined;
                const tone = mark === 'right' ? 'bg-neo-lime' : mark === 'wrong' ? 'bg-neo-orange' : answer[i] != null ? 'bg-neo-white' : 'bg-neo-navy-light border-dashed border-neo-cream/60';
                return (
                  <button
                    key={i}
                    type="button"
                    data-slot
                    data-mark={mark}
                    disabled={locked || answer[i] == null}
                    onClick={() => commit(removeAt(puzzle, answer, i))}
                    className={`flex aspect-[5/6] items-center justify-center rounded-neo ${dense ? 'border-2' : 'border-3'} border-neo-black font-neo-display font-black text-neo-navy shadow-hard-sm ${tone} ${feedback === 'correct' ? 'motion-safe:-translate-y-1 transition-transform duration-200' : ''}`}
                    style={slotStyle}
                  >
                    {tileChar(answer[i])}
                  </button>
                );
              })}
            </span>
          ))}
        </div>
        <div className="grid w-full grid-cols-[3rem_1fr_3rem] items-center gap-2">
          <span aria-hidden />
          <p
            aria-live="polite"
            className={`mx-auto min-h-[2.25rem] rounded-neo px-4 py-1 text-center font-neo-display text-lg font-black ${feedback === 'correct' ? 'bg-neo-lime text-neo-navy' : feedback === 'wrong' ? 'bg-neo-orange text-neo-navy' : 'text-neo-white/80'}`}
          >
            {feedback === 'correct' ? (
              <>
                <span>{labels.correct}</span>
                <span className="ms-2 inline-flex items-center gap-0.5 rounded-full border-2 border-neo-black bg-neo-yellow px-2 align-middle text-sm motion-safe:animate-bounce">
                  <Star className="h-3.5 w-3.5" fill="currentColor" aria-hidden />+{gain}
                </span>
              </>
            ) : feedback === 'wrong' ? (
              labels.wrong
            ) : misses >= 2 ? (
              labels.shown
            ) : (
              ''
            )}
          </p>
          <button
            type="button"
            onClick={() => commit(removeLast(puzzle, answer))}
            disabled={locked || answer.every((a) => a == null)}
            aria-label={labels.erase}
            className="flex h-12 w-12 items-center justify-center rounded-neo border-3 border-neo-black bg-neo-pink text-neo-navy shadow-hard transition-opacity disabled:opacity-0"
          >
            <Delete className="h-5 w-5 rtl:-scale-x-100" aria-hidden />
          </button>
        </div>
      </div>

      <div className="rounded-neo-lg border-4 border-neo-cream/40 bg-neo-navy-light p-3 shadow-hard">
        <div dir={dir} lang={lang} className={`flex flex-wrap items-center justify-center ${denseTiles ? 'gap-1.5' : 'gap-2'}`}>
          {puzzle.tiles.map((t) => {
            const used = answer.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                data-tile
                data-char={t.char}
                disabled={used || locked}
                onClick={() => commit(placeTile(puzzle, answer, t.id))}
                className={`flex items-center justify-center rounded-neo border-3 px-2 font-neo-display font-black ${denseTiles ? 'h-12 min-w-12 text-2xl' : 'h-14 min-w-14 text-3xl sm:h-16 sm:min-w-16'} shadow-hard transition-transform duration-100 active:translate-y-0.5 motion-reduce:transition-none ${used ? 'border-neo-cream/40 bg-neo-navy text-transparent shadow-none' : 'border-neo-black bg-neo-white text-neo-navy'}`}
              >
                {t.char}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
