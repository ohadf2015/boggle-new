/** A lesson word that cracks the exposed boss reads as a lesson hit on the projector, in both the Pixi and the reduced-motion feed. */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

import { BossProjectiles } from '../BossProjectiles';
import { bossHitTag } from '@/lib/pixiFx/bossFxScene';

const labels = { critText: 'CRIT', exposedText: 'EXPOSED', lessonText: 'LESSON' };

describe('bossHitTag', () => {
  it('Given a lesson crit, When tagged, Then it reads as a lesson hit', () => {
    expect(bossHitTag({ crit: true, exposed: true, lesson: true }, labels)).toBe('LESSON');
  });

  it('Given a long-word crit or an exposed hit, When tagged, Then the old tags stay', () => {
    expect(bossHitTag({ crit: true, exposed: false }, labels)).toBe('CRIT');
    expect(bossHitTag({ crit: false, exposed: true }, labels)).toBe('EXPOSED');
    expect(bossHitTag({ crit: false, exposed: false }, labels)).toBe('');
  });
});

describe('BossProjectiles (reduced motion)', () => {
  afterEach(cleanup);

  it('Given a lesson hit, When it flies, Then the feed tags it as a lesson hit', () => {
    render(<BossProjectiles hits={[{ id: 1, username: 'noa', word: 'cell', dmg: 30, crit: true, exposed: true, lesson: true }]} />);
    expect(screen.getByText('classroomBoss.lessonHit')).toBeInTheDocument();
    expect(screen.queryByText('classroomBoss.crit')).not.toBeInTheDocument();
  });

  it('Given an ordinary crit, When it flies, Then it keeps the crit tag', () => {
    render(<BossProjectiles hits={[{ id: 1, username: 'noa', word: 'photonic', dmg: 30, crit: true }]} />);
    expect(screen.getByText('classroomBoss.crit')).toBeInTheDocument();
  });
});
