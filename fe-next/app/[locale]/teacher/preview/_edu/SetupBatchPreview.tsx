'use client';

import { ClassPagePreview, InvitePreview } from './SetupBatchPreviews';
import { ClassesPreview, LibraryPreview } from './SetupBatchListPreviews';

/** Setup-batch fixtures: invite step, class page, classes list, library. Data is local; nothing writes. */
export function SetupBatchPreview({ state, v }: { state: string; v?: string }) {
  switch (state) {
    case 'edu-invite': return <InvitePreview v={v} />;
    case 'edu-class-page': return <ClassPagePreview v={v} />;
    case 'edu-classes': return <ClassesPreview />;
    case 'edu-library': return <LibraryPreview v={v} />;
    default: return null;
  }
}

export default SetupBatchPreview;
