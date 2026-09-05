/**
 * Class-gap → Live handoff.
 *
 * The share card is public (parents / Slack / Google Classroom Stream). One click
 * stages the missed words into lessonGameData (3-min timer) and opens a NEW Live
 * room as host. This is not the same-room reteach round (#896) on ClassroomResultsCard.
 */
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';
import {
  buildClassGapReteachLiveData,
  classGapReteachLivePath,
  type ClassGapSharePayload,
} from '@/lib/education/classGapShare';

export interface ClassGapReteachLiveCtaProps {
  payload: ClassGapSharePayload;
  reteachLabel: string;
  educationHref: string;
  educationLabel: string;
}

const primaryClass =
  'mt-6 inline-flex w-full items-center justify-center gap-2 px-4 py-3 font-bold bg-neo-lime text-neo-black border-neo border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg transition-all';
const secondaryClass =
  'mt-3 inline-flex w-full items-center justify-center px-4 py-3 font-bold bg-neo-navy text-neo-white border-neo border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard transition-all';

export function ClassGapReteachLiveCta({
  payload,
  reteachLabel,
  educationHref,
  educationLabel,
}: ClassGapReteachLiveCtaProps) {
  const router = useRouter();

  const handleStart = () => {
    const data = buildClassGapReteachLiveData(payload);
    if (!data) return;
    try {
      sessionStorage.setItem('lessonGameData', JSON.stringify(data));
    } catch {
      // Storage blocked — navigating would start an unseeded Live game.
      return;
    }
    router.push(classGapReteachLivePath(payload.locale));
  };

  if (payload.missedWords.length === 0) {
    return (
      <Link href={educationHref} className={primaryClass}>
        {educationLabel}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        data-testid="start-reteach-live"
        onClick={handleStart}
        className={primaryClass}
      >
        <Play className="w-5 h-5" aria-hidden />
        {reteachLabel}
      </button>
      <Link href={educationHref} className={secondaryClass}>
        {educationLabel}
      </Link>
    </>
  );
}
