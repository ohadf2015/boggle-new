'use client';

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import { tryValidateOffline } from '@/hooks/fastValidateWord';
import { isWordOnBoard } from '@/utils/utils';
import type { Language } from '@/shared/types/game';
import { currentPlayer, type PartyState } from '@/lib/party';
import { PartyBoard } from './PartyBoard';

const MIN_LEN = 3;

interface PartyPlayProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  state: PartyState;
  onSubmitWord: (word: string, isValid: boolean) => void;
  onTimesUp: () => void;
}

export function PartyPlay({ t, state, onSubmitWord, onTimesUp }: PartyPlayProps): ReactElement {
  const player = currentPlayer(state);
  const language = state.setup.language as Language;
  const { checkWord, isLoaded } = useDictionaryCache(language);
  const [seconds, setSeconds] = useState(state.setup.timerSeconds);
  const [feedback, setFeedback] = useState<string | null>(null);
  const ended = useRef(false);
  const onTimesUpRef = useRef(onTimesUp);
  onTimesUpRef.current = onTimesUp;

  useEffect(() => {
    ended.current = false;
    setSeconds(state.setup.timerSeconds);
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          if (!ended.current) {
            ended.current = true;
            onTimesUpRef.current();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [state.playerIndex, state.roundIndex, state.setup.timerSeconds]);

  const handleSubmit = useCallback(
    async (raw: string) => {
      const word = raw.trim().toLocaleLowerCase();
      if (word.length < MIN_LEN) {
        setFeedback(t('passAndPlay.tooShort'));
        return;
      }
      if (state.currentFound.some((w) => w.word === word)) {
        setFeedback(t('passAndPlay.alreadyFound'));
        return;
      }
      if (!isWordOnBoard(word, state.board, language)) {
        setFeedback(t('passAndPlay.notOnBoard'));
        return;
      }
      const cached = isLoaded && checkWord(word);
      const valid = cached || (await tryValidateOffline(word, language));
      if (!valid) {
        setFeedback(t('passAndPlay.notInDict'));
        onSubmitWord(word, false);
        return;
      }
      setFeedback(null);
      onSubmitWord(word, true);
    },
    [checkWord, isLoaded, language, onSubmitWord, state.board, state.currentFound, t],
  );

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full border-neo border-black text-lg"
            style={{ background: player.color }}
          >
            {player.emoji}
          </span>
          <div>
            <p className="font-neo-display font-bold">{t('passAndPlay.yourTurn', { name: player.name })}</p>
            <p className="text-xs text-neo-cream/70">
              {t('passAndPlay.roundN', { n: state.roundIndex + 1, total: state.setup.roundCount })}
            </p>
          </div>
        </div>
        <div className="rounded-neo border-neo border-black bg-neo-orange px-3 py-1 font-bold text-black">
          {t('passAndPlay.timeLeft')}: {seconds}
        </div>
      </header>

      <PartyBoard grid={state.board} onSubmit={(w) => void handleSubmit(w)} />

      <div className="flex justify-between text-sm">
        <span>
          {t('passAndPlay.score')}: {state.currentScore}
        </span>
        <span>
          {t('passAndPlay.unique')}: {state.currentFound.filter((w) => w.unique).length}
        </span>
      </div>

      {feedback && <p className="text-center text-sm text-neo-orange">{feedback}</p>}

      <ul className="flex flex-wrap gap-2">
        {state.currentFound.map((w) => (
          <li
            key={w.word}
            className={`rounded-neo border-neo border-black px-2 py-1 text-sm font-bold ${
              w.unique ? 'bg-neo-lime text-black' : 'bg-neo-cream/40 text-neo-cream'
            }`}
          >
            {w.word.toUpperCase()} {w.unique ? w.score : t('passAndPlay.stolen')}
          </li>
        ))}
      </ul>
    </div>
  );
}
