'use client';

import type { ComponentProps } from 'react';
import MultiplayerFlow from '../MultiplayerFlow';
import { EntryHeader } from './EntryHeader';
import { ENTRY_CHROME_ATTR } from './entryChrome';
import './entryChrome.css';
import './entryToasts.css';

export type EntryScreenProps = ComponentProps<typeof MultiplayerFlow>;

/**
 * The MP entry: room list, identity, join-by-code, create / join sheets — one
 * no-scroll MpScreen rendered by MultiplayerFlow. This wrapper adds the arcade
 * header and the SSR marker that hides the global site chrome from first paint
 * (entryChrome.ts). A classroom entry keeps the education chrome PageClient
 * renders, so it gets neither.
 */
export default function EntryScreen(props: EntryScreenProps) {
  const arcade = !props.isClassroomMode;
  return (
    <>
      {arcade && <span hidden {...{ [ENTRY_CHROME_ATTR]: 'off' }} />}
      <MultiplayerFlow {...props} header={arcade ? <EntryHeader /> : undefined} />
    </>
  );
}
