// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import TvCrosswordBroadcast from '../TvCrosswordBroadcast';
import TvWordcraftBroadcast from '../TvWordcraftBroadcast';

vi.mock('@/components/education/live/ProjectorCrosswordStage', () => ({ ProjectorCrosswordStage: () => <div /> }));
vi.mock('@/components/education/live/ProjectorWordcraftStage', () => ({ ProjectorWordcraftStage: () => <div /> }));

const t = (k: string) => k;

describe('classroom crossword and wordcraft walls', () => {
  it('stand on the sky page in a classroom and keep the arcade navy outside it', () => {
    render(<TvCrosswordBroadcast joinBar={null} socket={null} remainingTime={60} t={t} />);
    render(<TvWordcraftBroadcast joinBar={null} socket={null} players={[]} language="en" remainingTime={60} t={t as never} />);
    for (const id of ['tv-crossword-broadcast', 'tv-wordcraft-broadcast']) {
      expect(screen.getByTestId(id)).toHaveClass('edu-sky:bg-edu-page', 'bg-neo-navy');
    }
  });
});
