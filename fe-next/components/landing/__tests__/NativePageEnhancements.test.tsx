import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NativePageEnhancements from '../NativePageEnhancements';

vi.mock('next/image', () => ({
  default: ({ alt = '' }: { alt?: string }) => <div data-testid="next-image" data-alt={alt} />,
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('NativePageEnhancements', () => {
  it('renders English content for en locale', () => {
    render(<NativePageEnhancements locale="en" />);
    expect(screen.getByText(/8 modes, not 1\./i)).toBeInTheDocument();
    expect(screen.getByText(/Best for your moment/i)).toBeInTheDocument();
  });

  it('renders Hebrew content + RTL direction for he locale', () => {
    const { container } = render(<NativePageEnhancements locale="he" />);
    expect(container.querySelector('[dir="rtl"]')).toBeInTheDocument();
    expect(screen.getByText(/8 מצבי משחק/)).toBeInTheDocument();
  });

  it('renders Swedish content for sv locale', () => {
    render(<NativePageEnhancements locale="sv" />);
    expect(screen.getByText(/8 spellägen/)).toBeInTheDocument();
  });

  it('renders Japanese content for ja locale', () => {
    render(<NativePageEnhancements locale="ja" />);
    expect(screen.getByText(/8つのモード/)).toBeInTheDocument();
  });

  it('renders Spanish content for es locale', () => {
    render(<NativePageEnhancements locale="es" />);
    expect(screen.getByText(/8 modos, no 1\./)).toBeInTheDocument();
  });

  it('falls back to English content for unknown locale', () => {
    render(<NativePageEnhancements locale="fr" />);
    expect(screen.getByText(/8 modes, not 1\./i)).toBeInTheDocument();
  });

  it('shows native-review flag on non-English locales', () => {
    render(<NativePageEnhancements locale="he" />);
    expect(screen.getByText(/דורש סקירה/)).toBeInTheDocument();
  });

  it('does not show review flag on English locale', () => {
    render(<NativePageEnhancements locale="en" />);
    expect(screen.queryByText(/needs native review/i)).not.toBeInTheDocument();
  });

  it('renders 8 game-mode cards', () => {
    render(<NativePageEnhancements locale="en" />);
    expect(screen.getByText('Multiplayer Grid Battle')).toBeInTheDocument();
    expect(screen.getByText('Word Hunt Survival')).toBeInTheDocument();
    expect(screen.getByText('Daily Word Wheel')).toBeInTheDocument();
    expect(screen.getByText('Adventure')).toBeInTheDocument();
    expect(screen.getByText('Blast')).toBeInTheDocument();
    expect(screen.getByText('Brain Drills')).toBeInTheDocument();
    expect(screen.getByText('Vocabulary Duels')).toBeInTheDocument();
    expect(screen.getByText('Party Games')).toBeInTheDocument();
  });

  it('renders 6 best-for buckets', () => {
    render(<NativePageEnhancements locale="en" />);
    const bestForTags = ['PARTIES', 'CLASSROOMS', 'FAMILY', 'ASYNC', 'TEAMS', 'LANGUAGE'];
    bestForTags.forEach((tag) => {
      expect(screen.getByText(tag)).toBeInTheDocument();
    });
  });

  it('uses locale-prefixed hrefs', () => {
    render(<NativePageEnhancements locale="he" />);
    const partyLink = screen.getAllByRole('link').find((a) => a.getAttribute('href')?.startsWith('/he/'));
    expect(partyLink).toBeDefined();
  });
});
