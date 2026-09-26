/**
 * DESIGN §b.8: an aborted game returns to the MP entry through the ONE exit
 * (`useMpExit()('aborted')`) — the page resets in place (leaveRoom, session
 * clear) instead of each view improvising its own way back.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

import { MPGameAbortedModal } from '../MPGameAbortedModal';
import { MpExitProvider } from '@/hooks/useMpExit';

describe('MPGameAbortedModal exits through mpExit', () => {
  it('"Return to lobby" calls the page exit with reason "aborted"', () => {
    const pageExit = vi.fn();
    const onReturnToLobby = vi.fn();
    render(
      <MpExitProvider value={pageExit}>
        <MPGameAbortedModal wordCount={4} boardSeed="s" onContinueSolo={vi.fn()} onReturnToLobby={onReturnToLobby} />
      </MpExitProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /mp\.abort\.returnToLobby/ }));
    expect(onReturnToLobby).toHaveBeenCalledTimes(1);
    expect(pageExit).toHaveBeenCalledWith('aborted');
  });

  it('"Continue solo" never exits to the entry', () => {
    const pageExit = vi.fn();
    const onContinueSolo = vi.fn();
    render(
      <MpExitProvider value={pageExit}>
        <MPGameAbortedModal wordCount={4} boardSeed="s" onContinueSolo={onContinueSolo} onReturnToLobby={vi.fn()} />
      </MpExitProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /mp\.abort\.continueSolo/ }));
    expect(onContinueSolo).toHaveBeenCalledTimes(1);
    expect(pageExit).not.toHaveBeenCalled();
  });
});
