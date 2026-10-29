import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value, className }: { value: string; className?: string }) => <svg data-testid="join-qr" data-value={value} className={className} />,
}));

import ProjectorJoinPanel from '../ProjectorJoinPanel';
import { HERO_CODE_TEXT, HERO_QR_SIZE } from '../projectorLobbyModel';

const t = (key: string) => key;
const props = { gameCode: 'ab12cd', language: 'he', baseUrl: 'https://www.lexiclash.live', t };

describe('ProjectorJoinPanel — one hero: address, code and QR', () => {
  it('Given a room, Then the address, the code and the one QR sit in one block', () => {
    render(<ProjectorJoinPanel {...props} />);
    const hero = screen.getByTestId('projector-join-panel');
    expect(hero).toContainElement(screen.getByTestId('projector-join-address'));
    expect(hero).toContainElement(screen.getByTestId('projector-code'));
    expect(hero).toContainElement(screen.getByTestId('projector-qr'));
    expect(screen.getAllByTestId('join-qr')).toHaveLength(1);
    expect(screen.getAllByTestId('projector-code')).toHaveLength(1);
  });

  it('Given a room, Then a student can type the short address, and the QR opens the locale join route with the code', () => {
    render(<ProjectorJoinPanel {...props} />);
    expect(screen.getByTestId('projector-join-address')).toHaveTextContent('lexiclash.live/join');
    expect(screen.getByTestId('join-qr')).toHaveAttribute('data-value', 'https://www.lexiclash.live/he/join/ab12cd');
  });

  it('Given an RTL page, Then the code and the address stay left-to-right and isolated', () => {
    render(<ProjectorJoinPanel {...props} />);
    for (const id of ['projector-code', 'projector-join-address']) {
      const el = screen.getByTestId(id);
      expect(el).toHaveAttribute('dir', 'ltr');
      expect(el.className).toContain('[unicode-bidi:isolate]');
    }
  });

  it('Given the code, Then it is one tile per upper-case character, tabular, read out spaced for a screen reader', () => {
    render(<ProjectorJoinPanel {...props} />);
    const code = screen.getByTestId('projector-code');
    expect(screen.getAllByTestId('projector-code-char').map((c) => c.textContent)).toEqual(['A', 'B', '1', '2', 'C', 'D']);
    expect(code).toHaveAttribute('role', 'status');
    expect(code).toHaveAttribute('aria-label', 'education.projectorLobby.gameCode: A B 1 2 C D');
    expect(code.className).toContain('tabular-nums');
  });

  it('Given any frame, Then code and QR size from the container, never the viewport', () => {
    render(<ProjectorJoinPanel {...props} />);
    for (const cls of HERO_CODE_TEXT.split(' ')) expect(screen.getByTestId('projector-code').className).toContain(cls);
    for (const cls of HERO_QR_SIZE.split(' ')) expect(screen.getByTestId('join-qr').getAttribute('class')).toContain(cls);
    expect(screen.getByTestId('projector-join-panel').outerHTML).not.toMatch(/\d(vw|vh)\b/);
  });

  it('Given the QR, Then it sits on a light plate so a phone camera can read it on a dark wall', () => {
    render(<ProjectorJoinPanel {...props} />);
    expect(screen.getByTestId('projector-qr').className).toContain('bg-neo-white');
  });

  it('Given nobody in yet, Then the QR beckons; once someone joins it rests', () => {
    const { rerender } = render(<ProjectorJoinPanel {...props} waiting />);
    expect(screen.getByTestId('projector-qr')).toHaveAttribute('data-waiting', 'true');
    rerender(<ProjectorJoinPanel {...props} waiting={false} />);
    expect(screen.getByTestId('projector-qr')).toHaveAttribute('data-waiting', 'false');
  });

  it('Given the teacher copies, Then the clipboard gets the clickable link, not the bare code', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<ProjectorJoinPanel {...props} />);
    fireEvent.click(screen.getByTestId('projector-copy'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://www.lexiclash.live/he/join/ab12cd'));
  });
});
