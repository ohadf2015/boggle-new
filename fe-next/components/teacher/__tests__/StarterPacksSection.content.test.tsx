import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));

import { StarterPacksSection } from '../StarterPacksSection';
import { SESSION_TEMPLATES, sessionHostHref, sessionsFor } from '@/lib/education/sessionTemplates';
import { loadThemedPacks, packLessonInput, themedPackCode } from '@/lib/education/themedPacks';

const AUTUMN = new Date(2026, 9, 15);

describe('starter content: ready-to-run sessions and themed packs', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(AUTUMN);
  });
  afterEach(() => vi.useRealTimers());

  it('Given a Hebrew class, Then every Hebrew session is a card with its length, grade and a Run this link to the lobby in the teacher UI locale', () => {
    render(<StarterPacksSection onSelectPack={vi.fn()} language="he" classroomId="c1" />);
    const region = screen.getByRole('region', { name: 'education.starterPacks.sessions.title' });
    const cards = within(region).getAllByRole('article');
    expect(cards).toHaveLength(sessionsFor('he', AUTUMN).length);
    expect(within(region).queryByText('education.starterPacks.session.eslStarter.name')).toBeNull();

    const warmUp = SESSION_TEMPLATES.find((s) => s.id === 'warm-up')!;
    const card = within(region).getByText('education.starterPacks.session.warmUp.name').closest('article')!;
    expect(within(card).getByText('education.modePicker.minutes')).toBeInTheDocument();
    expect(within(card).getByText('eduLibrary.grade.any')).toBeInTheDocument();
    const art = card.querySelector('img');
    expect(art).toHaveAttribute('alt', '');
    expect(decodeURIComponent(art!.getAttribute('src')!)).toContain('edu-warmup-512.webp');
    expect(within(card).getByRole('link', { name: /education.starterPacks.sessions.runThis/ })).toHaveAttribute(
      'href',
      sessionHostHref('en', warmUp, themedPackCode('he', 'autumn'), 'c1'),
    );
  });

  it('Given the lobby handles the run itself, Then Run this hands over the session and its list instead of navigating', async () => {
    const onRunSession = vi.fn();
    render(<StarterPacksSection onSelectPack={vi.fn()} language="sv" onRunSession={onRunSession} />);
    const region = screen.getByRole('region', { name: 'education.starterPacks.sessions.title' });
    const card = within(region).getByText('education.starterPacks.session.icebreaker.name').closest('article')!;
    const packs = await loadThemedPacks('sv');
    const button = await within(card).findByRole('button', { name: /education.starterPacks.sessions.runThis/ });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    const classPack = packs.find((p) => p.theme === 'class')!;
    expect(onRunSession).toHaveBeenCalledWith(
      expect.objectContaining({
        session: SESSION_TEMPLATES.find((s) => s.id === 'icebreaker'),
        packCode: classPack.code,
        pack: packLessonInput(classPack),
      }),
    );
  });

  it('Given an English class, Then the ESL starter offers A1-B2 and the chosen level goes on the link', () => {
    render(<StarterPacksSection onSelectPack={vi.fn()} language="en" />);
    const card = screen.getByText('education.starterPacks.session.eslStarter.name').closest('article')!;
    for (const level of ['A1', 'A2', 'B1', 'B2']) expect(within(card).getByRole('radio', { name: level })).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('radio', { name: 'B2' }));
    const href = within(card).getByRole('link', { name: /education.starterPacks.sessions.runThis/ }).getAttribute('href')!;
    expect(new URL(href, 'https://x.test').searchParams.get('pack')).toBe('LC-EN-PK-ESL-B2');
  });

  it('Given the themed packs load, Then this season leads and Add to my lessons creates the lesson from that list', async () => {
    const onSelectPack = vi.fn();
    render(<StarterPacksSection onSelectPack={onSelectPack} language="es" />);
    const region = screen.getByRole('region', { name: 'education.starterPacks.themed.title' });
    const packs = await loadThemedPacks('es');
    const autumn = packs.find((p) => p.theme === 'autumn')!;
    const cards = await within(region).findAllByRole('article');
    expect(within(cards[0]).getByText(autumn.name)).toBeInTheDocument();
    expect(within(cards[0]).getByText('education.starterPacks.themed.thisSeason')).toBeInTheDocument();
    expect(decodeURIComponent(cards[0].querySelector('img')!.getAttribute('src')!)).toContain('edu-autumn-512.webp');
    fireEvent.click(within(cards[0]).getByRole('button', { name: /education.starterPacks.themed.addToLessons/ }));
    expect(onSelectPack).toHaveBeenCalledWith(packLessonInput(autumn));
  });

  it('Given more packs than fit, Then the rest sit behind Show all and every pack is reachable', async () => {
    render(<StarterPacksSection onSelectPack={vi.fn()} language="en" />);
    const region = screen.getByRole('region', { name: 'education.starterPacks.themed.title' });
    const first = await within(region).findAllByRole('article');
    const total = (await loadThemedPacks('en')).length;
    expect(first.length).toBeLessThan(total);
    fireEvent.click(within(region).getByRole('button', { name: 'education.starterPacks.themed.showAll' }));
    expect(within(region).getAllByRole('article')).toHaveLength(total);
  });
});
