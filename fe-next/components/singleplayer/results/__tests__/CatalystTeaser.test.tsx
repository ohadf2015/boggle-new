import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { CatalystTeaser } from '../CatalystTeaser';

vi.mock('framer-motion', () => {
  const motionComponent = ({ children, ...props }: any) => {
    const safe = { ...props };
    for (const k of ['initial','animate','exit','transition','variants','whileHover','whileTap','whileInView','viewport']) delete safe[k];
    return <div {...safe}>{children}</div>;
  };
  const motionObj = new Proxy({}, { get: () => motionComponent });
  return { m: motionObj };
});

const t = (key: string) => key;

describe('CatalystTeaser', () => {
  it('renders all four catalysts with name + description keys', () => {
    render(<CatalystTeaser t={t} />);
    expect(screen.getByText('catalystTeaser.earthquake.name')).toBeInTheDocument();
    expect(screen.getByText('catalystTeaser.earthquake.desc')).toBeInTheDocument();
    expect(screen.getByText('catalystTeaser.blizzard.name')).toBeInTheDocument();
    expect(screen.getByText('catalystTeaser.lightning.name')).toBeInTheDocument();
    expect(screen.getByText('catalystTeaser.meteor.name')).toBeInTheDocument();
  });

  it('renders teaser title + "one per game" tagline', () => {
    render(<CatalystTeaser t={t} />);
    expect(screen.getByText('catalystTeaser.title')).toBeInTheDocument();
    expect(screen.getByText('catalystTeaser.onePerGame')).toBeInTheDocument();
  });
});
