import { describe, expect, it } from 'vitest';
import { accessReturnPath } from '@/lib/education/accessReturnPath';
import { getCatalog, findList } from '@/lib/seo/wordLists/catalog';
import { PUBLIC_LIST_PARAM, parsePublicListId, publicListId, resolvePublicList, teacherSignupHref } from '../_components/listHandoff';
import { playableWord } from '@/lib/seo/wordLists/model';

const catalog = getCatalog();

describe('public list teacher hand-off', () => {
  it('Given every catalog list, When its id is parsed back, Then it resolves to that same list and no other', () => {
    const ids = new Set<string>();
    for (const list of catalog.lists) {
      const id = publicListId(list);
      expect(ids.has(id), id).toBe(false);
      ids.add(id);
      const parsed = parsePublicListId(id)!;
      expect(findList(parsed.segment, parsed.slug)?.id).toBe(list.id);
    }
  });

  it('Given a list, When the signed-out teacher CTA is built, Then access returns to new-class with the list id intact', () => {
    const list = catalog.lists.find((l) => l.lang === 'he')!;
    const href = teacherSignupHref('he', list);
    const from = new URL(href, 'https://x.test').searchParams.get('from');
    expect(href.startsWith('/he/education/access?from=')).toBe(true);
    const back = accessReturnPath(from);
    expect(back).not.toBeNull();
    const target = new URL(back!, 'https://x.test');
    expect(target.pathname).toBe('/he/teacher/classroom/new');
    expect(target.searchParams.get(PUBLIC_LIST_PARAM)).toBe(publicListId(list));
  });

  it('rejects malformed ids', () => {
    for (const bad of [null, '', 'english', '/x', 'english/', 'klingon/abc', 'english/a/b', 'english/../x'])
      expect(parsePublicListId(bad), String(bad)).toBeNull();
  });

  it('Given the id new-class receives, When resolved, Then it yields a ready quick-launch paste of that list in its own language', () => {
    const list = catalog.lists.find((l) => l.lang === 'he' && l.words.some((w) => w.word !== playableWord(w.word)))!;
    const got = resolvePublicList(publicListId(list))!;
    expect(got.language).toBe('he');
    expect(got.title).toBe(list.name.raw);
    expect(got.words).toEqual(list.words.map((w) => playableWord(w.word)));
  });

  it('Given a forged or stale id, When resolved, Then nothing is prefilled', () => {
    expect(resolvePublicList('english/no-such-list-xyz')).toBeNull();
    expect(resolvePublicList('english/../x')).toBeNull();
    expect(resolvePublicList(null)).toBeNull();
  });
});
