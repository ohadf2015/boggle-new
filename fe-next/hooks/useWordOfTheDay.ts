'use client';

/**
 * useWordOfTheDay Hook
 * Fetches the Word of the Day via Supabase REST.
 * Returns word, stats, whether current player found it, and loading state.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

/** Curated word lists per language — must match backend wordOfTheDayManager.ts pools */
const WORD_POOLS: Record<string, string[]> = {
  en: [
    'crystal', 'garden', 'bridge', 'shadow', 'temple', 'forest', 'dragon', 'silver',
    'planet', 'frozen', 'castle', 'marble', 'throne', 'harbor', 'sunset', 'wizard',
    'beacon', 'riddle', 'anchor', 'shield', 'scroll', 'mystic', 'falcon', 'legend',
    'spirit', 'timber', 'orchid', 'voyage', 'prism', 'comet', 'pearl', 'raven',
    'blaze', 'coral', 'ember', 'frost', 'haven', 'ivory', 'jewel', 'karma',
    'lumen', 'maple', 'noble', 'oasis', 'pixel', 'quest', 'reign', 'solar',
    'torch', 'ultra', 'vivid', 'wrath', 'zephyr', 'abyss', 'bloom', 'cedar',
    'drift', 'eagle', 'flame', 'gleam', 'honor', 'index', 'jolly', 'knack',
    'lunar', 'mirth', 'nexus', 'omega', 'plume', 'quilt', 'roost', 'spine',
    'tidal', 'unity', 'vigor', 'whirl', 'yield', 'zodiac', 'atlas', 'brush',
    'chord', 'delta', 'epoch', 'fjord', 'glyph', 'helix', 'ionic', 'jinx',
    'kayak', 'lyric', 'mocha', 'niche', 'orbit', 'pulse', 'quartz', 'rustic',
    'siren', 'trove', 'umbra', 'vault', 'wraith', 'xenon', 'yonder', 'zenith',
    'bliss', 'charm', 'dusk', 'fable', 'grace', 'haste', 'kneel', 'latch',
    'mural', 'nerve', 'onset', 'pluck', 'realm', 'storm', 'twist', 'verge',
  ],
  he: [
    'שמש', 'ירח', 'כוכב', 'גשר', 'חלום', 'יער', 'דרקון', 'כסף',
    'טירה', 'שלג', 'אביב', 'ברזל', 'נחש', 'סוכר', 'צבע', 'קשת',
    'רוח', 'שלום', 'עולם', 'חכמה', 'גבור', 'נהר', 'הרים', 'פרח',
    'זהב', 'אבן', 'מלך', 'שיר', 'אור', 'חושך', 'מים', 'אש',
    'עץ', 'דרך', 'בית', 'ספר', 'חול', 'גלים', 'ענן', 'כנף',
    'לילה', 'בוקר', 'ערב', 'שמים', 'ארץ', 'דגים', 'ציפור', 'פרפר',
    'גינה', 'חיוך', 'שמחה', 'תקווה', 'אהבה', 'חסד', 'אמת', 'צדק',
    'משפט', 'חוכמה', 'ברכה', 'נשמה', 'רוגע', 'שקט', 'מעיין', 'נחל',
    'סלע', 'מדבר', 'חוף', 'אוצר', 'מפתח', 'שער', 'מגדל', 'חומה',
    'גיבור', 'אגדה', 'סיפור', 'חידה', 'פלא', 'קסם', 'נס', 'חג',
  ],
  sv: [
    'kristall', 'trädgård', 'bro', 'skugga', 'tempel', 'skog', 'drake', 'silver',
    'planet', 'frusen', 'slott', 'marmor', 'tron', 'hamn', 'solnedgång', 'trollkarl',
    'fyr', 'gåta', 'ankare', 'sköld', 'rulle', 'mystisk', 'falk', 'legend',
    'ande', 'timmer', 'orkidé', 'resa', 'prisma', 'komet', 'pärla', 'korp',
    'eld', 'korall', 'glöd', 'frost', 'hamn', 'elfenben', 'juvel', 'karma',
    'ljus', 'lönn', 'ädel', 'oas', 'pixel', 'uppdrag', 'regn', 'sol',
    'fackla', 'storm', 'livlig', 'vrede', 'bris', 'avgrund', 'blomma', 'ceder',
    'drift', 'örn', 'flamma', 'glans', 'ära', 'magi', 'måne', 'gryning',
  ],
  ja: [
    'crystal', 'garden', 'bridge', 'shadow', 'temple', 'forest', 'dragon', 'silver',
    'planet', 'frozen', 'castle', 'marble', 'throne', 'harbor', 'sunset', 'wizard',
    'beacon', 'riddle', 'anchor', 'shield', 'scroll', 'mystic', 'falcon', 'legend',
    'spirit', 'timber', 'orchid', 'voyage', 'prism', 'comet', 'pearl', 'raven',
    'blaze', 'coral', 'ember', 'frost', 'haven', 'ivory', 'jewel', 'karma',
    'lumen', 'maple', 'noble', 'oasis', 'pixel', 'quest', 'reign', 'solar',
  ],
  es: [
    'cristal', 'jardín', 'puente', 'sombra', 'templo', 'bosque', 'dragón', 'plata',
    'planeta', 'helado', 'castillo', 'mármol', 'trono', 'puerto', 'ocaso', 'mago',
    'faro', 'enigma', 'ancla', 'escudo', 'pergamino', 'místico', 'halcón', 'leyenda',
    'espíritu', 'madera', 'orquídea', 'viaje', 'prisma', 'cometa', 'perla', 'cuervo',
    'llama', 'coral', 'brasa', 'escarcha', 'refugio', 'marfil', 'joya', 'karma',
    'luz', 'arce', 'noble', 'oasis', 'pixel', 'misión', 'reino', 'solar',
    'antorcha', 'tormenta', 'vívido', 'furia', 'brisa', 'abismo', 'flor', 'cedro',
    'deriva', 'águila', 'fuego', 'brillo', 'honor', 'magia', 'luna', 'alba',
  ],
};

function getWordPool(language: string): string[] {
  return WORD_POOLS[language] || WORD_POOLS.en;
}

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash % 10000) / 10000;
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export interface WotdData {
  word: string;
  date: string;
  stats: { foundCount: number; totalPlayers: number; foundPercent: number };
  playerFound: boolean;
  loading: boolean;
  error: string | null;
}

export function useWordOfTheDay(language: string): WotdData {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState({ foundCount: 0, totalPlayers: 0, foundPercent: 0 });
  const [playerFound, setPlayerFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = getTodayDate();
  const pool = getWordPool(language);
  const seed = `${today}-${language}-wotd`;
  const index = Math.floor(seededRandom(seed) * pool.length);
  const word = pool[index];

  const fetchData = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      // Fetch global stats
      const { data: wotdRow } = await supabase
        .from('daily_word_of_day')
        .select('found_count, total_players')
        .eq('date', today)
        .eq('language', language)
        .maybeSingle();

      if (wotdRow) {
        const fc = wotdRow.found_count ?? 0;
        const tp = wotdRow.total_players ?? 0;
        setStats({
          foundCount: fc,
          totalPlayers: tp,
          foundPercent: tp > 0 ? Math.round((fc / tp) * 100) : 0,
        });
      }

      // Check if current player found it
      if (user?.id) {
        const { data: playerRow } = await supabase
          .from('daily_word_of_day_players')
          .select('found')
          .eq('player_id', user.id)
          .eq('date', today)
          .maybeSingle();

        if (playerRow) {
          setPlayerFound(!!playerRow.found);
        }
      }
    } catch {
      setError(t('errors.failedToLoadWordOfTheDay'));
    } finally {
      setLoading(false);
    }
  }, [today, language, user?.id, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { word, date: today, stats, playerFound, loading, error };
}
