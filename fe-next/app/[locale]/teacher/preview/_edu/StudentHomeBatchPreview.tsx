'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { JoinNameStep } from '@/components/education/join/JoinNameStep';
import { JoinCodeStep } from '@/components/education/join/JoinCodeStep';
import { NAME_NOT_ALLOWED_KEY } from '@/components/education/join/joinFailure';
import type { JoinFlowState } from '@/components/education/join/joinFlowState';
import type { JoinTarget } from '@/components/education/join/joinTarget';
import { StudentHomePreview } from './StudentHomePreviews';

const noop = () => undefined;

const TARGETS: Record<string, JoinTarget> = {
  refused: { verdict: 'classroom', label: '7B English', classroomId: 'c' },
  classroom: { verdict: 'classroom', label: '7B English', classroomId: 'c' },
  live: { verdict: 'game', label: '7B English', classroomId: 'c', gameCode: 'K7Q2WM' },
  'live-noname': { verdict: 'game', classroomId: 'c', gameCode: 'K7Q2WM' },
};

/** `?state=edu-join-flow&v=code|classroom|live|live-noname|refused`. */
function JoinFlowPreview({ v = 'refused' }: { v?: string }) {
  const { t } = useLanguage();
  const refused = v === 'refused';
  const [name, setName] = useState(refused ? 'Butthead' : '');
  const [code, setCode] = useState(v === 'code' ? 'K7Q' : 'K7Q2WM');
  const flow = {
    step: v === 'code' ? 'code' : 'name',
    code,
    setCode,
    target: TARGETS[v] ?? null,
    codeRejected: false,
    codeErrorKey: null,
    refusalTick: 0,
    isChecking: false,
    showNameField: true,
    name,
    setName,
    nameError: refused,
    suggestedName: refused ? t('eduStudent.join.funNames').split(/[,،、|]/)[0]?.trim() || 'Bouncy Otter' : null,
    formErrorKey: refused ? NAME_NOT_ALLOWED_KEY : null,
    submit: noop,
    advance: noop,
    refuseTooLong: noop,
    backToCode: noop,
    isSubmitting: false,
    isHolding: false,
    canSubmit: true,
  } as unknown as JoinFlowState;
  return (
    <div className="min-h-dvh bg-neo-navy">
      <main className="mx-auto w-full max-w-md px-4 py-5 lg:max-w-xl">
        {v === 'code'
          ? <JoinCodeStep flow={flow} pasteNoteKey={null} onPaste={noop} />
          : <JoinNameStep flow={flow} nameRef={{ current: null }} goRef={{ current: null }} />}
      </main>
    </div>
  );
}

export function StudentHomeBatchPreview({ state, v }: { state: string; v?: string }) {
  if (state === 'edu-join-flow') return <JoinFlowPreview v={v} />;
  return <StudentHomePreview v={v} />;
}
