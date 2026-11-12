import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MascotEdgeStage, MASCOT_EDGE_STAGE_CLASS } from '../MascotEdgeStage';

describe('MascotEdgeStage', () => {
  it('uses the top strip by default', () => {
    const { container } = render(<MascotEdgeStage><span /></MascotEdgeStage>);
    expect((container.firstChild as HTMLElement).className).toBe(MASCOT_EDGE_STAGE_CLASS);
  });

  it('moves to the strip a mode passes, so a gag never sits on that mode\'s clues', () => {
    const { container } = render(<MascotEdgeStage className="bottom-0 h-[6.5rem]"><span /></MascotEdgeStage>);
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toContain('bottom-0 h-[6.5rem]');
    expect(cls).not.toContain('top-[calc');
    expect(cls).toContain('overflow-hidden');
  });
});
