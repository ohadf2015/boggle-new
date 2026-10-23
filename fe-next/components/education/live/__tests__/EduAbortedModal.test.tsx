import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

import { MpExitProvider } from '@/hooks/useMpExit';
import EduAbortedModal from '@/components/education/live/EduAbortedModal';

const root = resolve(__dirname, '../../../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

describe('EduAbortedModal', () => {
  const renderModal = () => {
    const pageExit = vi.fn();
    const onReturnToLobby = vi.fn();
    render(
      <MpExitProvider value={pageExit}>
        <EduAbortedModal wordCount={3} boardSeed="s" onContinueSolo={vi.fn()} onReturnToLobby={onReturnToLobby} />
      </MpExitProvider>,
    );
    return { pageExit, onReturnToLobby };
  };

  it('given a classroom round lost its connection, when the modal shows, then it offers no solo game', () => {
    renderModal();
    expect(screen.queryByTestId('mp-abort-continue-solo')).not.toBeInTheDocument();
    expect(screen.queryByText('mp.abort.continueSolo')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'mp.abort.title' })).toBeInTheDocument();
  });

  it('given the modal, when the student taps back to class, then it leaves through the page exit', () => {
    const { pageExit, onReturnToLobby } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'eduLive.results.backToClass' }));
    expect(onReturnToLobby).toHaveBeenCalledTimes(1);
    expect(pageExit).toHaveBeenCalledWith('aborted');
  });
});

describe('classroom rooms swap the aborted modal through the edu live surfaces', () => {
  it('the edu live router provides it', () => {
    expect(read('app/[locale]/education/live/EduLivePhaseRouter.tsx')).toMatch(/AbortedModal: EduAbortedModal/);
  });

  it.each(['player/components/PlayerInGameView.tsx', 'host/components/HostInGameView.tsx'])('%s renders the swapped modal', (file) => {
    expect(read(file)).toMatch(/useEduLiveSurfaces\(\)\.AbortedModal \?\? MPGameAbortedModal/);
  });
});
