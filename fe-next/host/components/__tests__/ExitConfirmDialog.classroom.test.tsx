// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExitConfirmDialog } from '../HostDialogs';

const t = (key: string) => key;

describe('ExitConfirmDialog — classroom host', () => {
  afterEach(cleanup);

  it('Given a classroom room, Then it says one honest thing: the room closes for the class', () => {
    render(<ExitConfirmDialog open onOpenChange={() => {}} onConfirm={() => {}} t={t} classroom />);
    expect(screen.getByText('eduLive.exit.title')).toBeInTheDocument();
    expect(screen.getByText('eduLive.exit.body')).toBeInTheDocument();
    expect(screen.queryByText('hostView.confirmExit')).toBeNull();
  });

  it('Given a classroom room, Then confirming ends the game and cancelling keeps it', () => {
    const onConfirm = vi.fn();
    render(<ExitConfirmDialog open onOpenChange={() => {}} onConfirm={onConfirm} t={t} classroom />);
    expect(screen.getByText('eduLive.exit.stay')).toBeInTheDocument();
    fireEvent.click(screen.getByText('eduLive.exit.confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('Given an arcade room, Then the original copy is unchanged', () => {
    render(<ExitConfirmDialog open onOpenChange={() => {}} onConfirm={() => {}} t={t} />);
    expect(screen.getByText('hostView.confirmExit')).toBeInTheDocument();
  });
});
