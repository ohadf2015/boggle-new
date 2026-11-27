import React from 'react';
import { render, screen } from '@testing-library/react';
import { MpPodium } from '../MpPodium';

vi.mock('@/components/Avatar', () => ({ __esModule: true, default: () => <span /> }));

const row = (username: string, rank: number, score: number) => ({ username, rank, score, isMe: false, seriesTotal: null, seriesDelta: 0 });

describe('MpPodium', () => {
  it('Given two players tied for first, Then both stand on equal blocks with the same label', () => {
    render(<MpPodium rows={[row('Ana', 1, 0), row('Ben', 1, 0)]} isRevealed={() => true} label="podium" t={(k) => k} />);
    const blocks = screen.getAllByTestId('mp-standing-row').map((li) => li.querySelector('[aria-hidden="true"]:last-child') as HTMLElement);
    expect(blocks[0].className).toBe(blocks[1].className);
    expect(blocks.map((b) => b.textContent)).toEqual(['1', '1']);
  });

  it('Given distinct places, Then first stands tallest in the centre, in server order', () => {
    render(<MpPodium rows={[row('A', 1, 30), row('B', 2, 20), row('C', 3, 10)]} isRevealed={() => true} label="podium" t={(k) => k} />);
    const lis = screen.getAllByTestId('mp-standing-row');
    expect(lis.map((li) => li.textContent?.[0])).toEqual(['A', 'B', 'C']);
    expect(lis[0].className).toMatch(/order-2/);
  });
});
