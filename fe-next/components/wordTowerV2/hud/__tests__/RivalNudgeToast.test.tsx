import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RivalNudgeToast, rivalAhead } from '../RivalNudgeToast';
import { rivalsLine } from '../SheetCards';

afterEach(cleanup);

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key} ${JSON.stringify(params)}` : key);

describe('rivalAhead', () => {
  it('given a rival 11.2 m above, when read, then it suggests them with the gap rounded up', () => {
    expect(rivalAhead({ id: 'a', name: 'Dana', peakM: 31.2 }, 20)).toEqual({ name: 'Dana', gapM: 12 });
  });

  it('given the marked rival is already below you, when read, then there is nobody to suggest', () => {
    expect(rivalAhead({ id: 'a', name: 'Dana', peakM: 18 }, 20)).toBeNull();
    expect(rivalAhead(null, 20)).toBeNull();
  });
});

describe('RivalNudgeToast', () => {
  it('given a wrecking ball is earned with a rival above, when it lands, then the toast names them and wreck opens the rivals', () => {
    const onWreck = vi.fn();
    const target = { name: 'Dana', gapM: 12 };
    const { rerender } = render(<RivalNudgeToast t={t} balls={1} target={target} onWreck={onWreck} reducedMotion />);
    expect(screen.queryByRole('status')).toBeNull();
    rerender(<RivalNudgeToast t={t} balls={2} target={target} onWreck={onWreck} reducedMotion />);
    expect(screen.getByRole('status').textContent).toContain('wordTowerV2.nudge.ballAhead {"name":"Dana","m":12}');
    fireEvent.click(screen.getByText('wordTowerV2.nudge.wreck'));
    expect(onWreck).toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('given balls the run started with, when rendered, then nothing pops', () => {
    render(<RivalNudgeToast t={t} balls={3} target={null} reducedMotion />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('rivalsLine', () => {
  it('given someone raided you, when read, then the payback comes before any other suggestion', () => {
    expect(rivalsLine(t, 2, { name: 'Dana', gapM: 3 }, 'Noa').tone).toBe('revenge');
  });

  it('given a rival above and no raid, when read, then it names the rival and the metres', () => {
    expect(rivalsLine(t, 0, { name: 'Dana', gapM: 3 }, null).text).toBe('wordTowerV2.hud.sheet.rivalsAhead {"name":"Dana","m":3}');
  });
});
