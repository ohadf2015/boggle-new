import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ReteachActions } from '../ReteachActions';
import type { ReteachLinks } from '../useReteachLinks';

const t = (key: string) => key;

const links = {
  classGapUrl: null,
  googleClassroomReteachHref: 'https://classroom.google.com/a',
  googleClassroomAssignHref: 'https://classroom.google.com/b',
  googleClassroomUnpluggedAssignHref: 'https://classroom.google.com/c',
  googleClassroomLiveAssignHref: 'https://classroom.google.com/d',
  unpluggedReteachHref: '/en/education/unplugged-reteach?x=1',
  teamTilesUnpluggedHref: '/en/education/team-tiles-unplugged?x=1',
  classicUnpluggedHref: '/en/education/classic-unplugged?x=1',
  missGapAsyncAssignHref: '/en/teacher?assign=1',
  canLaunchMissGapQuestionPack: true,
  onLaunchMissGapQuestionPack: vi.fn(),
  shareState: 'idle',
  missGapShareState: 'idle',
  onPrintPracticeSheet: vi.fn(),
  onPrintUnpluggedPack: vi.fn(),
  onShareMissGapPractice: vi.fn(),
  onShareGap: vi.fn(),
} as unknown as ReteachLinks;

describe('ReteachActions — the More menu is three short groups, not a wall', () => {
  it('Given every option, Then they sit under play-now, send-home and print-share headings', () => {
    render(<ReteachActions links={links} onReteach={() => {}} t={t} variant="more" />);
    const play = screen.getByTestId('reteach-group-play');
    const send = screen.getByTestId('reteach-group-send');
    const print = screen.getByTestId('reteach-group-print');

    expect(within(play).getByTestId('play-reteach-round')).toBeInTheDocument();
    expect(within(play).getByTestId('launch-miss-gap-question-pack-live')).toBeInTheDocument();
    expect(within(play).getByTestId('start-classic-unplugged')).toBeInTheDocument();

    expect(within(send).getByTestId('assign-miss-gap-async-homework')).toBeInTheDocument();
    expect(within(send).getByTestId('assign-practice-google-classroom')).toBeInTheDocument();

    expect(within(print).getByTestId('print-missed-words-practice-sheet')).toBeInTheDocument();
    expect(within(print).getByTestId('share-miss-gap-practice')).toBeInTheDocument();
  });

  it('Given the panel, Then each group is labelled so the teacher can scan it', () => {
    render(<ReteachActions links={links} onReteach={() => {}} t={t} variant="more" />);
    expect(screen.getByText('eduLive.reteach.playNow')).toBeInTheDocument();
    expect(screen.getByText('eduLive.reteach.sendHome')).toBeInTheDocument();
    expect(screen.getByText('eduLive.reteach.printShare')).toBeInTheDocument();
  });

  it('Given the four Google Classroom posts, Then they fold into one nested choice inside send-home', () => {
    render(<ReteachActions links={links} onReteach={() => {}} t={t} variant="more" />);
    const gc = screen.getByTestId('reteach-google-classroom');
    expect(gc.tagName).toBe('DETAILS');
    expect(within(gc).getByTestId('post-reteach-google-classroom')).toBeInTheDocument();
    expect(within(gc).getByTestId('assign-unplugged-google-classroom')).toBeInTheDocument();
  });
});
