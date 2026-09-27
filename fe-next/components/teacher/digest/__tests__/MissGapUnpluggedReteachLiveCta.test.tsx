import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MissGapUnpluggedReteachLiveCta } from '../MissGapUnpluggedReteachLiveCta';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

describe('MissGapUnpluggedReteachLiveCta', () => {
  beforeEach(() => {
    push.mockClear();
    sessionStorage.clear();
  });

  it('deep-links Unplugged Live with missed words and seeds reteach Live', () => {
    render(
      <MissGapUnpluggedReteachLiveCta
        locale="en"
        lesson="Physics 101"
        missedWords={['neutron', 'quark']}
        found={1}
        total={3}
      />,
    );

    const unplugged = screen.getByTestId('miss-gap-start-unplugged-reteach-live');
    expect(unplugged).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/en\/education\/unplugged-reteach\?/),
    );
    expect(unplugged.getAttribute('href')).toContain('missed=neutron');
    expect(unplugged.getAttribute('href')).not.toContain('Maya');

    fireEvent.click(screen.getByTestId('miss-gap-start-reteach-live'));
    expect(push).toHaveBeenCalledWith('/en/multiplayer?fromLesson=true&autoCreate=true');
    const seeded = JSON.parse(sessionStorage.getItem('lessonGameData') || 'null');
    expect(seeded.vocabularyWords).toEqual(['neutron', 'quark']);
  });

  it('hides when there are no missed words', () => {
    const { container } = render(
      <MissGapUnpluggedReteachLiveCta locale="en" missedWords={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
