'use client';

import { useRef, type ComponentProps } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { markMpChromeSession, MP_SESSION_MARK_SCRIPT } from './mpChromeSession';
import MultiplayerFlow from '../MultiplayerFlow';
import { EntryHeader } from './EntryHeader';
import { ENTRY_CHROME_ATTR } from './entryChrome';
import './entryChrome.css';

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
  // A cold load can remount the page tree during hydration and drop the SSR
  // marker below for a frame while this lazy chunk resolves, flashing the header
  // spacer in (a 60–124px layout shift). The <html> session mark survives that
  // remount, so it is set as early as possible:
  // - SSR: a one-line script streamed into the HTML runs while it parses (once
  //   per request; Next calls these callbacks on every flush);
  // - client: during render, not in an effect (client-side arrival).
  const streamed = useRef(false);
  useServerInsertedHTML(() => {
    if (!arcade || streamed.current) return null;
    streamed.current = true;
    return <script dangerouslySetInnerHTML={{ __html: MP_SESSION_MARK_SCRIPT }} />;
  });
  if (arcade) markMpChromeSession();
  return (
    <>
      {arcade && <span hidden {...{ [ENTRY_CHROME_ATTR]: 'off' }} />}
      <MultiplayerFlow {...props} header={arcade ? <EntryHeader /> : undefined} />
    </>
  );
}
