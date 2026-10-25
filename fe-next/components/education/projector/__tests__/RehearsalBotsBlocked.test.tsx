import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

const switchTo = vi.fn();
let capturedOnApplied: ((id: string) => void) | undefined;
vi.mock('@/components/education/lobby/useClassroomModeSwitch', () => ({
  useClassroomModeSwitch: (args: { onApplied?: (id: string) => void }) => {
    capturedOnApplied = args.onApplied;
    return { pendingMode: null, switchTo };
  },
}));
vi.mock('@/utils/SocketContext', () => ({ getSharedSocketIfExists: () => null }));

import { RehearsalBotsBlocked } from '../RehearsalBotsBlocked';

const t = (key: string) => key;

describe('RehearsalBotsBlocked', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnApplied = undefined;
  });

  it('Given a mode bots cannot play, Then it says so and offers Classic for the rehearsal', () => {
    render(<RehearsalBotsBlocked gameCode="AB12CD" currentMode="wordcraft" t={t} onApplied={vi.fn()} onRehearse={vi.fn()} />);
    expect(screen.getByTestId('rehearsal-bots-blocked')).toHaveTextContent('education.projectorLobby.rehearseBotsBlocked');
    fireEvent.click(screen.getByTestId('rehearsal-use-classic'));
    expect(switchTo).toHaveBeenCalledWith('classic');
  });

  it('Given the teacher asked for Classic, When the server confirms, Then the rehearsal starts', () => {
    const onApplied = vi.fn();
    const onRehearse = vi.fn();
    render(<RehearsalBotsBlocked gameCode="AB12CD" currentMode="wordcraft" t={t} onApplied={onApplied} onRehearse={onRehearse} />);
    fireEvent.click(screen.getByTestId('rehearsal-use-classic'));
    act(() => capturedOnApplied?.('classic'));
    expect(onApplied).toHaveBeenCalledWith('classic');
    expect(onRehearse).toHaveBeenCalledTimes(1);
  });

  it('Given a mode switch the teacher made elsewhere, Then no rehearsal starts on its own', () => {
    const onRehearse = vi.fn();
    render(<RehearsalBotsBlocked gameCode="AB12CD" currentMode="wordcraft" t={t} onApplied={vi.fn()} onRehearse={onRehearse} />);
    act(() => capturedOnApplied?.('classic'));
    expect(onRehearse).not.toHaveBeenCalled();
  });
});
