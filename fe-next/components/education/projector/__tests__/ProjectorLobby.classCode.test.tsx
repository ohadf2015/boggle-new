import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const classes = vi.hoisted(() => ({ list: [] as { id: string; join_code: string }[], loading: false }));
vi.mock('@/hooks/useLiveClassroomGameInfo', () => ({ useLiveClassroomGameInfo: () => ({ classroomId: 'c1', classroomName: '7B', studyWordCount: 0 }) }));
vi.mock('@/hooks/useProjectorStudyCards', () => ({ useProjectorStudyCards: () => [] }));
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => ({ classrooms: classes.list, isLoading: classes.loading }) }));
vi.mock('@/utils/SocketContext', () => ({ getSharedSocketIfExists: () => ({ emit: vi.fn(), on: vi.fn(), off: vi.fn() }) }));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock('qrcode.react', () => ({ QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="join-qr" data-value={value} /> }));

import ProjectorLobby from '../ProjectorLobby';

const props = {
  gameCode: 'S32RH6',
  language: 'en',
  baseUrl: 'https://www.lexiclash.live',
  students: [],
  t: (key: string) => key,
  onStartGame: vi.fn(),
  startLabelKey: 'hostView.startClassGame',
  classroomGameMode: 'classic' as const,
};
const code = () => screen.getAllByTestId('projector-code-char').map((c) => c.textContent).join('');

describe('ProjectorLobby — the code on the wall is the one a student types', () => {
  it('Given the teacher owns the room\'s class, Then the wall shows that class code labelled as the class code, and the QR keeps the room', () => {
    classes.list = [{ id: 'c0', join_code: 'ZZZZZZ' }, { id: 'c1', join_code: '8DAH7M' }];
    render(<ProjectorLobby {...props} />);
    expect(code()).toBe('8DAH7M');
    expect(screen.getByTestId('projector-code-sticker')).toHaveTextContent('education.projectorLobby.gameCode');
    expect(screen.getByTestId('join-qr')).toHaveAttribute('data-value', 'https://www.lexiclash.live/en/join/S32RH6');
  });

  it('Given the class list has not loaded or has no match, Then the room code shows, labelled as the game code', () => {
    classes.list = [];
    render(<ProjectorLobby {...props} />);
    expect(code()).toBe('S32RH6');
    expect(screen.getByTestId('projector-code-sticker')).toHaveTextContent('tvBroadcast.gameCode');
  });
});
