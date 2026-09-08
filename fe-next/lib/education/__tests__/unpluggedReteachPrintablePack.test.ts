/**
 * Unplugged reteach printable pack — cover QR deep-link + practice pages.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildUnpluggedReteachPackLiveUrl,
  buildUnpluggedReteachPackQrImageUrl,
  buildUnpluggedReteachPrintablePackHtml,
  openUnpluggedReteachPrintablePack,
  UNPLUGGED_PACK_QR_UTM,
} from '../unpluggedReteachPrintablePack';

const labels = {
  title: 'Missed-words practice',
  subtitle: 'Device-free reteach — write each word, then use it in a sentence',
  writeLabel: 'Write the word',
  sentenceLabel: 'Use it in a sentence',
  nameLine: 'Name: ________________',
  dateLine: 'Date: ________________',
  footer: 'LexiClash · unplugged reteach pack',
  packTitle: 'Unplugged reteach pack',
  packSubtitle: 'Printable pack from last-session misses — QR opens Live on the projector',
  packFoil: 'Kahoot Classic Unplugged has no printable pack with a Live QR — LexiClash does',
  qrHint: 'Scan to open Unplugged reteach Live',
  packHowTo: '1) Print this pack 2) Hand practice pages to students 3) Scan the QR on the teacher screen',
  practiceHeading: 'Student practice pages',
};

describe('buildUnpluggedReteachPackLiveUrl', () => {
  it('deep-links to Unplugged Live with pack QR UTMs and no student names', () => {
    const url = buildUnpluggedReteachPackLiveUrl({
      locale: 'en',
      lesson: 'Physics 101',
      teacher: 'Ms. Cohen',
      found: 2,
      total: 3,
      missedWords: ['neutron', 'quark'],
    });
    expect(url.startsWith('https://www.lexiclash.live/en/education/unplugged-reteach?')).toBe(
      true,
    );
    expect(url).toContain('missed=neutron');
    expect(url).toContain('quark');
    expect(url).toContain(`utm_source=${UNPLUGGED_PACK_QR_UTM.utm_source}`);
    expect(url).toContain(`utm_medium=${UNPLUGGED_PACK_QR_UTM.utm_medium}`);
    expect(url).toContain(`utm_campaign=${UNPLUGGED_PACK_QR_UTM.utm_campaign}`);
    expect(url).not.toContain('Maya');
    expect(url).not.toContain('Noa');
  });
});

describe('buildUnpluggedReteachPackQrImageUrl', () => {
  it('encodes the Live URL into a printable QR image endpoint', () => {
    const live =
      'https://www.lexiclash.live/en/education/unplugged-reteach?missed=neutron&utm_source=unplugged_pack';
    const img = buildUnpluggedReteachPackQrImageUrl(live);
    expect(img.startsWith('https://api.qrserver.com/v1/create-qr-code/')).toBe(true);
    expect(img).toContain('size=220x220');
    expect(decodeURIComponent(img)).toContain(live);
  });
});

describe('buildUnpluggedReteachPrintablePackHtml', () => {
  it('returns null when there are no missed words', () => {
    expect(
      buildUnpluggedReteachPrintablePackHtml({
        lesson: 'Physics 101',
        missedWords: [],
        labels,
      }),
    ).toBeNull();
  });

  it('renders cover QR + practice pages with Live deep-link and no student names', () => {
    const html = buildUnpluggedReteachPrintablePackHtml({
      lesson: 'Physics 101',
      teacher: 'Ms. Cohen',
      missedWords: ['neutron', 'quark'],
      found: 1,
      total: 3,
      locale: 'en',
      labels,
    });
    expect(html).toBeTruthy();
    expect(html!).toContain('data-testid="unplugged-reteach-printable-pack"');
    expect(html!).toContain('data-testid="unplugged-reteach-pack-cover"');
    expect(html!).toContain('data-testid="unplugged-reteach-pack-qr"');
    expect(html!).toContain('data-testid="unplugged-reteach-pack-practice"');
    expect(html!).toContain('Unplugged reteach pack');
    expect(html!).toContain('Physics 101');
    expect(html!).toContain('Ms. Cohen');
    expect(html!).toContain('neutron');
    expect(html!).toContain('quark');
    expect(html!).toContain('Write the word');
    expect(html!).toContain('Use it in a sentence');
    expect(html!).toContain('/education/unplugged-reteach');
    expect(html!).toContain('utm_source=unplugged_pack');
    expect(html!).toContain('api.qrserver.com/v1/create-qr-code');
    expect(html!).toContain('Kahoot Classic Unplugged');
    expect(html!).toContain('window.print()');
    expect(html!).not.toContain('Maya');
    expect(html!).not.toContain('Noa');
  });

  it('escapes HTML in lesson / words so a crafted word cannot break the pack', () => {
    const html = buildUnpluggedReteachPrintablePackHtml({
      lesson: '<script>alert(1)</script>',
      missedWords: ['<img src=x onerror=alert(1)>'],
      labels,
    });
    expect(html!).not.toContain('<script>alert(1)</script>');
    expect(html!).toContain('&lt;script&gt;');
    expect(html!).toContain('&lt;img');
  });

  it('sets rtl dir for Hebrew locale', () => {
    const html = buildUnpluggedReteachPrintablePackHtml({
      lesson: 'שיעור',
      missedWords: ['מילה'],
      locale: 'he',
      labels,
    });
    expect(html!).toContain('dir="rtl"');
    expect(html!).toContain('lang="he"');
  });
});

describe('openUnpluggedReteachPrintablePack', () => {
  const originalOpen = window.open;

  beforeEach(() => {
    vi.stubGlobal(
      'open',
      vi.fn(() => {
        const doc = {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        };
        return { document: doc, close: vi.fn(), focus: vi.fn() };
      }),
    );
  });

  afterEach(() => {
    window.open = originalOpen;
  });

  it('opens a print window with the pack HTML', () => {
    const ok = openUnpluggedReteachPrintablePack({
      lesson: 'Physics 101',
      missedWords: ['neutron'],
      labels,
    });
    expect(ok).toBe(true);
    expect(window.open).toHaveBeenCalled();
    const win = vi.mocked(window.open).mock.results[0].value as {
      document: { write: ReturnType<typeof vi.fn> };
    };
    expect(win.document.write).toHaveBeenCalled();
    const written = String(win.document.write.mock.calls[0][0]);
    expect(written).toContain('unplugged-reteach-printable-pack');
    expect(written).toContain('neutron');
  });

  it('returns false when there are no words', () => {
    expect(
      openUnpluggedReteachPrintablePack({
        lesson: 'Physics 101',
        missedWords: [],
        labels,
      }),
    ).toBe(false);
  });
});
