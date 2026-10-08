'use client';

import { useState } from 'react';
import { ActionKey, BackspaceKey, LetterKey } from './CrosswordKeyButton';

// 五十音 grid: columns are consonant rows (あかさ…わ), rows are vowels; '・' is an empty slot.
// Small kana are folded full-size in the grid (answer.foldJaKana), so they need no keys.
const BASE = ['あかさたなはまやらわ', 'いきしちにひみ・り・', 'うくすつぬふむゆる・', 'えけせてねへめ・れ・', 'おこそとのほもよろを'];
const VOICED = ['がざだばぱ', 'ぎじぢびぴ', 'ぐずづぶぷ', 'げぜでべぺ', 'ごぞどぼぽ'];
const KEY_H = 'h-9';
const SIDE_W = 'w-[2.4rem] shrink-0';

export interface CrosswordKanaKeyboardProps {
  onLetter: (letter: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
  backspaceLabel: string;
  voicedLabel: string;
  basicLabel: string;
}

export function CrosswordKanaKeyboard({ onLetter, onBackspace, disabled, backspaceLabel, voicedLabel, basicLabel }: CrosswordKanaKeyboardProps) {
  const [voiced, setVoiced] = useState(false);
  const rows = voiced ? VOICED : BASE;
  const side = [
    <LetterKey key="n" ch="ん" onPress={onLetter} disabled={disabled} className={`${KEY_H} ${SIDE_W}`} />,
    <LetterKey key="dash" ch="ー" onPress={onLetter} disabled={disabled} className={`${KEY_H} ${SIDE_W}`} />,
    <span key="gap" aria-hidden="true" className={SIDE_W} />,
    <ActionKey
      key="toggle"
      label={voiced ? basicLabel : voicedLabel}
      pressed={voiced}
      onPress={() => setVoiced((v) => !v)}
      disabled={disabled}
      className={`${KEY_H} ${SIDE_W} text-sm`}
    >
      {voiced ? 'あ' : '゛゜'}
    </ActionKey>,
    <BackspaceKey key="bs" label={backspaceLabel} onPress={onBackspace} disabled={disabled} className={`${KEY_H} ${SIDE_W}`} />,
  ];

  return (
    <div dir="ltr" lang="ja" className="flex flex-col gap-1 w-full max-w-[28rem] mx-auto select-none">
      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-[3px]">
          {[...row].map((ch, j) =>
            ch === '・' ? (
              <span key={`gap-${j}`} aria-hidden="true" className="flex-1 max-w-[2.4rem]" />
            ) : (
              <LetterKey key={ch} ch={ch} onPress={onLetter} disabled={disabled} className={KEY_H} />
            ),
          )}
          <span aria-hidden="true" className="w-1 shrink-0" />
          {side[i]}
        </div>
      ))}
    </div>
  );
}
