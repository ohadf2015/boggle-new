/**
 * Classroom Marketplace / Workspace add-on — Unplugged Stream assign (#968 payload).
 */
import { describe, it, expect } from 'vitest';
import { CLASS_GAP_ORIGIN } from '../classGapShare';
import {
  CLASSROOM_ADDON_ASSIGN_PATH,
  CLASSROOM_ADDON_ATTACHMENT_PATH,
  CLASSROOM_ADDON_DISCOVERY_PATH,
  CLASSROOM_ADDON_MARKETPLACE_PATH,
  buildClassroomAddonAssign,
  buildClassroomAddonAttachmentUrl,
  buildClassroomAddonDiscoveryUrl,
  buildUnpluggedAddOnAttachment,
  buildUnpluggedStreamAssignUrl,
  classroomAddonMarketplaceListing,
} from '../googleClassroomAddon';

describe('buildUnpluggedStreamAssignUrl', () => {
  it('reuses #968 Unplugged Live deep-link as a Classroom assignment', () => {
    const href = buildUnpluggedStreamAssignUrl({
      missedWords: ['neutron', 'quark'],
      lesson: 'Physics 101',
      locale: 'en',
    });
    const u = new URL(href);
    expect(u.origin + u.pathname).toBe('https://classroom.google.com/share');
    expect(u.searchParams.get('itemtype')).toBe('assignment');
    const join = u.searchParams.get('url') || '';
    expect(join).toContain('https://www.lexiclash.live/en/education/unplugged-reteach');
    expect(join).toContain('neutron');
    expect(join).not.toContain('lexiclash.com');
    expect(href).not.toContain('Maya');
  });

  it('rejects an empty missed-word list', () => {
    expect(() => buildUnpluggedStreamAssignUrl({ missedWords: [] })).toThrow(/missed word/);
  });
});

describe('buildUnpluggedAddOnAttachment', () => {
  it('points teacher and student views at the framed attachment URI', () => {
    const att = buildUnpluggedAddOnAttachment({
      missedWords: ['neutron'],
      lesson: 'Physics 101',
      locale: 'en',
    });
    expect(att.title).toContain('Physics 101');
    expect(att.teacherViewUri).toContain(CLASSROOM_ADDON_ATTACHMENT_PATH);
    expect(att.studentViewUri).toBe(att.teacherViewUri);
    expect(att.teacherViewUri).toContain('neutron');
    expect(att.teacherViewUri).toContain(CLASS_GAP_ORIGIN);
    expect(att.teacherViewUri).not.toContain('lexiclash.com');
  });
});

describe('buildClassroomAddonDiscoveryUrl', () => {
  it('registers the Marketplace discovery URI on lexiclash.live', () => {
    const url = buildClassroomAddonDiscoveryUrl({
      locale: 'en',
      context: { courseId: '123', itemId: '234', itemType: 'courseWork', addOnToken: 'tok' },
    });
    expect(url).toContain(`${CLASS_GAP_ORIGIN}/en${CLASSROOM_ADDON_DISCOVERY_PATH}`);
    expect(url).toContain('courseId=123');
    expect(url).toContain('addOnToken=tok');
    expect(url).not.toContain('lexiclash.com');
  });
});

describe('buildClassroomAddonAttachmentUrl', () => {
  it('frames the Unplugged reteach query on the attachment path', () => {
    const url = buildClassroomAddonAttachmentUrl({
      missedWords: ['chlorophyll'],
      lesson: 'Plants',
      locale: 'es',
    });
    expect(url).toContain(`${CLASS_GAP_ORIGIN}/es${CLASSROOM_ADDON_ATTACHMENT_PATH}`);
    expect(url).toContain('chlorophyll');
    expect(url).toContain('lang=es');
  });
});

describe('buildClassroomAddonAssign', () => {
  it('returns Stream assign + attachment URIs from missed words', () => {
    const result = buildClassroomAddonAssign({
      missed_words: ['neutron', 'quark'],
      lesson: 'Physics 101',
      locale: 'en',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.streamAssignUrl).toContain('classroom.google.com/share');
    expect(result.streamAssignUrl).toContain('itemtype=assignment');
    expect(result.unpluggedUrl).toContain('/education/unplugged-reteach');
    expect(result.attachment.teacherViewUri).toContain(CLASSROOM_ADDON_ATTACHMENT_PATH);
    expect(result.student_names).toBe(false);
    expect(result.marketplace_url).toBe(`${CLASS_GAP_ORIGIN}${CLASSROOM_ADDON_MARKETPLACE_PATH}`);
    expect(JSON.stringify(result)).not.toContain('Maya');
    expect(JSON.stringify(result)).not.toContain('lexiclash.com');
  });

  it('rejects student names / roster fields', () => {
    const result = buildClassroomAddonAssign({
      missed_words: ['neutron'],
      student_names: ['Maya'],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/not accepted/i);
  });

  it('requires at least one missed word', () => {
    const result = buildClassroomAddonAssign({ missed_words: [] });
    expect(result.ok).toBe(false);
  });
});

describe('classroomAddonMarketplaceListing', () => {
  it('publishes Marketplace metadata without roster scopes', () => {
    const listing = classroomAddonMarketplaceListing();
    expect(listing.production_url).toBe('https://www.lexiclash.live');
    expect(listing.origin).toBe(CLASS_GAP_ORIGIN);
    expect((listing.privacy as { roster_scopes: boolean }).roster_scopes).toBe(false);
    expect((listing.api as { assign: string }).assign).toContain(CLASSROOM_ADDON_ASSIGN_PATH);
    expect(JSON.stringify(listing)).not.toContain('lexiclash.com');
  });
});
