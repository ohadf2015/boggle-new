/**
 * ChatGPT Action reteach — class-level missed words only, 3-min Live.
 */
import { describe, it, expect } from 'vitest';
import {
  CLASS_GAP_ORIGIN,
  CLASS_GAP_RETEACH_TIMER_SECONDS,
} from '../classGapShare';
import {
  CHATGPT_ACTION_OPENAPI_PATH,
  CHATGPT_RETEACH_PATH,
  CHATGPT_RETEACH_TIMER_SECONDS,
  buildChatGptHostUrl,
  buildChatGptReteach,
  chatgptActionOpenApiYaml,
  rejectStudentNames,
} from '../chatgptReteach';

describe('rejectStudentNames', () => {
  it('allows a missed-word payload with no roster fields', () => {
    expect(rejectStudentNames({ missed_words: ['neutron'] })).toBeNull();
  });

  it('rejects student names / roster / emails', () => {
    expect(rejectStudentNames({ missed_words: ['neutron'], student_names: ['Maya'] })).toMatch(
      /not accepted/i,
    );
    expect(rejectStudentNames({ roster: ['Maya', 'Noa'] })).toMatch(/not accepted/i);
    expect(rejectStudentNames({ names: 'Maya' })).toMatch(/not accepted/i);
    expect(rejectStudentNames({ emails: ['maya@school.edu'] })).toMatch(/not accepted/i);
  });

  it('ignores empty roster fields', () => {
    expect(rejectStudentNames({ missed_words: ['neutron'], student_names: [] })).toBeNull();
    expect(rejectStudentNames({ missed_words: ['neutron'], names: '' })).toBeNull();
  });
});

describe('buildChatGptReteach', () => {
  it('creates a class-gap share URL and a host landing from missed words', () => {
    const result = buildChatGptReteach({
      missed_words: ['photosynthesis', 'chlorophyll'],
      lesson: 'Unit 4 plants',
      locale: 'en',
      action: 'create',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.timer_seconds).toBe(180);
    expect(result.timer_seconds).toBe(CLASS_GAP_RETEACH_TIMER_SECONDS);
    expect(result.timer_seconds).toBe(CHATGPT_RETEACH_TIMER_SECONDS);
    expect(result.missed_words).toEqual(['photosynthesis', 'chlorophyll']);
    expect(result.student_accounts).toBe(false);
    expect(result.student_names).toBe(false);

    const share = new URL(result.share_url);
    expect(share.origin).toBe(CLASS_GAP_ORIGIN);
    expect(share.pathname).toBe('/en/education/class-gap');
    expect(share.searchParams.get('missed')).toBe('photosynthesis,chlorophyll');
    expect(share.searchParams.get('lesson')).toBe('Unit 4 plants');
    expect(share.searchParams.has('teacher')).toBe(false);
    expect(share.href).not.toContain('Maya');

    const host = new URL(result.host_url);
    expect(host.origin).toBe(CLASS_GAP_ORIGIN);
    expect(host.pathname).toBe(`/en${CHATGPT_RETEACH_PATH}`);
    expect(host.searchParams.get('autostart')).toBe('1');
    expect(host.searchParams.get('missed')).toBe('photosynthesis,chlorophyll');
    expect(result.openapi_url).toBe(`${CLASS_GAP_ORIGIN}${CHATGPT_ACTION_OPENAPI_PATH}`);
  });

  it('accepts a comma-separated words string from ChatGPT materials', () => {
    const result = buildChatGptReteach({ words: 'neutron, quark\nlepton', action: 'host' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.action).toBe('host');
    expect(result.missed_words).toEqual(['neutron', 'quark', 'lepton']);
    expect(result.instructions).toMatch(/host_url/i);
  });

  it('returns 400-shaped error when there are no missed words', () => {
    const result = buildChatGptReteach({ lesson: 'Unit 4', missed_words: [] });
    expect(result).toEqual({
      ok: false,
      error: 'Provide at least one missed word (no student names).',
    });
  });

  it('refuses a roster even when missed words are also present', () => {
    const result = buildChatGptReteach({
      missed_words: ['neutron'],
      student_names: ['Maya'],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/not accepted/i);
    expect(JSON.stringify(result)).not.toContain('Maya');
  });

  it('never writes a teacher/student name onto host or share URLs', () => {
    const result = buildChatGptReteach({
      missed_words: ['neutron'],
      lesson: 'Physics 101',
      // extra fields must be ignored, not copied
      teacher: 'Ms. Cohen',
      foundBy: ['Maya'],
    } as Record<string, unknown>);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.share_url).not.toContain('Maya');
    expect(result.host_url).not.toContain('Maya');
    expect(result.share_url).not.toContain('Cohen');
    expect(result.host_url).not.toContain('Cohen');
  });
});

describe('buildChatGptHostUrl', () => {
  it('stays on lexiclash.live and carries only class-level query params', () => {
    const url = new URL(
      buildChatGptHostUrl({
        locale: 'he',
        lesson: 'שיעור',
        teacher: '',
        found: 0,
        total: 1,
        missedWords: ['שלום'],
      }),
    );
    expect(url.origin).toBe(CLASS_GAP_ORIGIN);
    expect(url.pathname).toBe('/he/education/chatgpt-reteach');
    expect(url.searchParams.get('lang')).toBe('he');
    expect(url.searchParams.get('autostart')).toBe('1');
    expect(url.searchParams.has('teacher')).toBe(false);
  });
});

describe('chatgptActionOpenApiYaml', () => {
  it('is a ChatGPT Action OpenAPI 3 document on the live origin', () => {
    const yaml = chatgptActionOpenApiYaml();
    expect(yaml).toMatch(/^openapi: 3\.0\.1/m);
    expect(yaml).toContain('https://www.lexiclash.live');
    expect(yaml).toContain('operationId: createOrHostReteachLive');
    expect(yaml).toContain('/api/chatgpt/reteach');
    expect(yaml).toContain('NEVER send student names');
    expect(yaml).toContain('timer_seconds');
    expect(yaml).toContain('180');
    expect(yaml).not.toContain('student_name:');
  });
});
