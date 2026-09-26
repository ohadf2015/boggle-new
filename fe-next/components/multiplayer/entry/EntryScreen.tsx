'use client';

import type { ComponentProps } from 'react';
import MultiplayerFlow from '../MultiplayerFlow';
import { MpScreen } from '../shell/MpScreen';

export type EntryScreenProps = ComponentProps<typeof MultiplayerFlow>;

/**
 * ENTRY stub (FOUNDATION): today's room list / create / join flow inside the
 * no-scroll MP frame. The ENTRY piece owns this file and redesigns it; its
 * props are the frozen contract MpPhaseRouter renders with.
 *
 * Global chrome on entry: PageClient is the single writer of the nav-hiding
 * state and consults `ENTRY_HIDES_GLOBAL_CHROME` (./entryChrome) for this
 * state. The body scrolls inside the frame, never the page.
 */
export default function EntryScreen(props: EntryScreenProps) {
  return <MpScreen testId="mp-entry" bodyScroll="inner" body={<MultiplayerFlow {...props} />} />;
}
