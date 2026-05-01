'use client';

import { useState, useCallback, useEffect } from 'react';
import { BattleSceneRoot } from '@/components/adventure/v2/BattleSceneRoot';
import { PostFightModal } from '@/components/adventure/v2/PostFightModal';
import { useCombatStore } from '@/lib/adventure/v2/state/runStore';
import { loadHeDict, isHeDictLoaded } from '@/lib/adventure/v2/engine/__protoDictHe';
import type { Locale } from '@/lib/adventure/v2/types';

interface PageClientProps {
  locale: Locale;
}

export function PageClient({ locale }: PageClientProps) {
  const [outcome, setOutcome] = useState<'victory' | 'defeat' | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [dictReady, setDictReady] = useState(locale !== 'he' || isHeDictLoaded());
  const [dictError, setDictError] = useState<string | null>(null);

  useEffect(() => {
    if (locale !== 'he' || dictReady) return;
    let alive = true;
    loadHeDict()
      .then(() => {
        if (alive) setDictReady(true);
      })
      .catch((err: unknown) => {
        if (alive) setDictError(err instanceof Error ? err.message : 'failed to load dict');
      });
    return () => {
      alive = false;
    };
  }, [locale, dictReady]);

  const onVictory = useCallback(() => setOutcome('victory'), []);
  const onDefeat = useCallback(() => setOutcome('defeat'), []);
  const onRetry = useCallback(() => {
    setOutcome(null);
    setResetKey((k) => k + 1);
    useCombatStore.getState().startNewBattle(locale);
    useCombatStore.getState().dispatch({ type: 'START_TURN' });
  }, [locale]);

  const isHe = locale === 'he';

  return (
    <main
      style={{
        background: '#0a0a14',
        minHeight: '100vh',
        padding: 16,
        fontFamily: 'Fredoka, Rubik, sans-serif',
      }}
      dir={isHe ? 'rtl' : 'ltr'}
    >
      <h1
        style={{
          color: '#bfff00',
          fontSize: 24,
          textAlign: 'center',
          marginBottom: 8,
          textShadow: '2px 2px 0 #000',
        }}
      >
        {isHe ? 'אדוונצ\'ר פרוטוטייפ' : 'Adventure Prototype'}
        <span style={{ marginInlineStart: 12, fontSize: 14, opacity: 0.6 }}>
          [{locale}]
        </span>
      </h1>
      <p
        style={{
          color: '#888',
          fontSize: 14,
          textAlign: 'center',
          marginBottom: 16,
          fontFamily: 'Rubik, sans-serif',
        }}
      >
        {isHe
          ? 'הקש על אריחים או הקלד אותיות · Enter כדי לכשף · Backspace לבטל'
          : 'Tap tiles or type letters · Enter to cast · Backspace to undo'}
      </p>

      {dictError && (
        <p style={{ color: '#ef4444', textAlign: 'center', fontFamily: 'Rubik, sans-serif' }}>
          Dictionary load error: {dictError}
        </p>
      )}

      {!dictReady ? (
        <p
          style={{
            color: '#bfff00',
            textAlign: 'center',
            fontSize: 18,
            padding: 80,
            fontFamily: 'Rubik, sans-serif',
          }}
        >
          {isHe ? 'טוען מילון…' : 'Loading dictionary…'}
        </p>
      ) : (
        <BattleSceneRoot
          key={resetKey}
          onVictory={onVictory}
          onDefeat={onDefeat}
          locale={locale}
        />
      )}

      {outcome && <PostFightModal outcome={outcome} onRetry={onRetry} onExit={onRetry} />}
    </main>
  );
}
