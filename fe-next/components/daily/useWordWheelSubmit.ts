import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import { isValidWordWheelWord, type WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

export type LetterClear = 'now' | 'later' | 'keep';
export type RejectKind = 'rule' | 'invalid' | 'found' | 'unknown';
/** true = a word, false = not a word, null = could not check right now. */
export type WordCheck = boolean | null;

interface BuiltLetter { letter: string; wheelIndex: number }

interface UseWordWheelSubmitArgs {
  puzzle: WordWheelPuzzle;
  t: (key: string, params?: Record<string, string | number>) => string;
  builtLettersRef: MutableRefObject<BuiltLetter[]>;
  setBuiltLetters: (letters: BuiltLetter[]) => void;
  wordsFoundRef: MutableRefObject<string[]>;
  gameOverRef: MutableRefObject<boolean>;
  lastSubmitWasDragRef: MutableRefObject<boolean>;
  onValidateWord: (word: string) => Promise<WordCheck>;
  /** Synchronous dictionary answer: true/false when loaded, null when cold. */
  onQuickVerdict?: (word: string) => boolean | null;
  accept: (word: string, spelled: BuiltLetter[]) => void;
  reject: (message: string, clear: LetterClear, spelled: BuiltLetter[], kind: RejectKind) => void;
  /** The spelled letters are out for a network verdict. */
  hold?: (release: { indices: number[]; letters: string[] }) => void;
  /** That verdict came back. */
  drop?: () => void;
}

/**
 * Turns the word on the wheel into a verdict. A loaded dictionary answers at release, so the score,
 * the found list and the cleared trail all land in the same frame; only a cold dictionary waits on
 * the network, and a swipe never waits on it: the wheel clears and the word rides as `pendingWord`.
 */
export function useWordWheelSubmit({
  puzzle, t, builtLettersRef, setBuiltLetters, wordsFoundRef, gameOverRef, lastSubmitWasDragRef,
  onValidateWord, onQuickVerdict, accept, reject, hold, drop,
}: UseWordWheelSubmitArgs) {
  const [pendingWord, setPendingWord] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const inFlightRef = useRef<Set<string>>(new Set());
  const tapBlockRef = useRef(false);

  const handleSubmit = useCallback(() => {
    const spelled = builtLettersRef.current;
    const word = spelled.map(bl => bl.letter).join('').toUpperCase();
    if (tapBlockRef.current || word.length === 0 || gameOverRef.current) return;
    if (inFlightRef.current.has(word)) return;
    const byDrag = lastSubmitWasDragRef.current;
    lastSubmitWasDragRef.current = false;
    const clear: LetterClear = byDrag ? 'now' : 'later';

    if (word.length < 3) return reject(t('wordWheel.tooShort', { min: '3' }), clear, spelled, 'rule');
    if (!word.includes(puzzle.centerLetter.toUpperCase())) {
      return reject(t('wordWheel.missingCenter', { letter: puzzle.centerLetter }), clear, spelled, 'rule');
    }
    if (!isValidWordWheelWord(word, puzzle.centerLetter, puzzle.allLetters)) {
      return reject(t('wordWheel.invalidLetters'), clear, spelled, 'rule');
    }
    if (wordsFoundRef.current.includes(word)) return reject(t('wordWheel.alreadyFound'), 'now', spelled, 'found');

    const credit = (ok: WordCheck): WordCheck => {
      if (ok === true && !gameOverRef.current && !wordsFoundRef.current.includes(word)) accept(word, spelled);
      return ok;
    };
    const settle = () => { inFlightRef.current.delete(word); };
    const verdictFailed = (ok: WordCheck, clearFor: LetterClear) => {
      if (ok === true || gameOverRef.current) return;
      if (ok === null) reject(t('wordWheel.cantCheck'), 'keep', spelled, 'unknown');
      else reject(t('wordWheel.notInDictionary'), clearFor, spelled, 'invalid');
    };

    const quick = onQuickVerdict?.(word) ?? null;
    if (quick === true) return accept(word, spelled);
    inFlightRef.current.add(word);

    if (quick === false) {
      reject(t('wordWheel.notInDictionary'), clear, spelled, 'invalid');
      // Community-validated words live only on the server; credit them late rather than never.
      void onValidateWord(word).then(credit, () => null).finally(settle);
      return;
    }

    hold?.({ indices: spelled.map(bl => bl.wheelIndex), letters: spelled.map(bl => bl.letter) });
    if (byDrag) {
      builtLettersRef.current = [];
      setBuiltLetters([]);
      setPendingWord(word);
      void onValidateWord(word)
        .then(credit, () => null)
        .then((ok) => {
          // Put an unchecked swipe back on the line so retrying is one tap.
          if (ok === null && builtLettersRef.current.length === 0 && !gameOverRef.current) {
            builtLettersRef.current = spelled;
            setBuiltLetters(spelled);
          }
          verdictFailed(ok, 'keep');
        })
        .finally(() => {
          settle();
          drop?.();
          setPendingWord(cur => (cur === word ? null : cur));
        });
      return;
    }

    tapBlockRef.current = true;
    setIsValidating(true);
    void onValidateWord(word)
      .then(credit, () => null)
      .then((ok) => verdictFailed(ok, clear))
      .finally(() => {
        settle();
        drop?.();
        tapBlockRef.current = false;
        setIsValidating(false);
      });
  }, [puzzle, t, builtLettersRef, setBuiltLetters, wordsFoundRef, gameOverRef, lastSubmitWasDragRef, onValidateWord, onQuickVerdict, accept, reject, hold, drop]);

  return { handleSubmit, pendingWord, isValidating };
}
