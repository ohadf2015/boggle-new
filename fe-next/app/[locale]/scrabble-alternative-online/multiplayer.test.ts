import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS_PER_ROOM } from '@/shared/constants/gameConstants';
import { MULTIPLAYER_FAQ, MULTIPLAYER_HEADING, MULTIPLAYER_STEPS } from './multiplayer';

const SRC = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');

describe('scrabble-alternative-online multiplayer section', () => {
  it('names the multiplayer query in the H2 and the FAQ', () => {
    expect(MULTIPLAYER_HEADING.toLowerCase()).toContain('online multiplayer scrabble');
    expect(MULTIPLAYER_FAQ.q.toLowerCase()).toContain('online multiplayer scrabble');
    expect(SRC).toContain('{MULTIPLAYER_HEADING}');
    const faqs = SRC.slice(SRC.indexOf('const faqs = ['), SRC.indexOf('const faqJsonLd'));
    expect(faqs).toContain('MULTIPLAYER_FAQ');
  });

  it('states the room cap the server enforces', () => {
    const copy = [MULTIPLAYER_FAQ.a, ...MULTIPLAYER_STEPS.map(s => s.body)].join(' ');
    expect(copy).toContain(`up to ${MAX_PLAYERS_PER_ROOM} players`);
  });
});
