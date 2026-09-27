/**
 * ChatGPT Action host landing — stages missed words into lessonGameData
 * (#896 shape, 180s timer from #949) and opens a NEW Live room.
 */
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  buildClassGapReteachLiveData,
  classGapReteachLivePath,
  type ClassGapSharePayload,
} from '@/lib/education/classGapShare';

export interface ChatGptReteachAutostartProps {
  payload: ClassGapSharePayload;
  reteachLabel: string;
  educationHref: string;
  educationLabel: string;
}

const primaryClass =
  'mt-6 inline-flex w-full items-center justify-center gap-2 px-4 py-3 font-bold bg-neo-lime text-neo-black border-neo border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg transition-all';
const secondaryClass =
  'mt-3 inline-flex w-full items-center justify-center px-4 py-3 font-bold bg-neo-navy text-neo-white border-neo border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard transition-all';

export function ChatGptReteachAutostart({
  payload,
  reteachLabel,
  educationHref,
  educationLabel,
}: ChatGptReteachAutostartProps) {
  const router = useRouter();
  const started = useRef(false);

  const startLive = () => {
    const data = buildClassGapReteachLiveData(payload);
    if (!data) return false;
    try {
      sessionStorage.setItem('lessonGameData', JSON.stringify(data));
    } catch {
      return false;
    }
    router.replace(classGapReteachLivePath(payload.locale));
    return true;
  };

  useEffect(() => {
    if (started.current) return;
    if (payload.missedWords.length === 0) return;
    started.current = true;
    startLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot host handoff
  }, []);

  if (payload.missedWords.length === 0) {
    return (
      <a href={educationHref} className={primaryClass}>
        {educationLabel}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        data-testid="chatgpt-start-reteach-live"
        onClick={startLive}
        className={primaryClass}
      >
        {reteachLabel}
      </button>
      <a href={educationHref} className={secondaryClass}>
        {educationLabel}
      </a>
    </>
  );
}
