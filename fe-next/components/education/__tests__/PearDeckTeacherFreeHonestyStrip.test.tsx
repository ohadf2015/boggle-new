import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PearDeckTeacherFreeHonestyStrip } from '../PearDeckTeacherFreeHonestyStrip';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => {
      const map: Record<string, string> = {
        'education.vsPearDeck.teacherFree.eyebrow': 'Named-response honesty — Free vs Premium',
        'education.vsPearDeck.teacherFree.title':
          'Pear Deck Teacher Free: anonymous projector; names via spreadsheet export. LexiClash: classroom roster + named feedback.',
        'education.vsPearDeck.teacherFree.lede':
          'Pear Deck Teacher Free publishes unlimited Sessions/participants and projects answers anonymously. Named responses on Free: export to spreadsheet or Flashcard Factory hover. Premium Teacher Dashboard shows names, hide/block, Drawing/Draggable, Reflect & Review, Teacher Feedback. LexiClash free covers up to 50 with classroom roster / named feedback — no Premium named-dashboard gate.',
        'education.vsPearDeck.teacherFree.pdTitle': 'Pear Deck Teacher Free — named-response caps',
        'education.vsPearDeck.teacherFree.pdBody':
          'Unlimited Sessions + participants · anonymous projector · names only via spreadsheet export or Flashcard Factory hover. Premium: live named Teacher Dashboard, hide/block, Drawing/Draggable, Reflect & Review, Teacher Feedback.',
        'education.vsPearDeck.teacherFree.lexiTitle':
          'LexiClash — classroom roster + named feedback on free',
        'education.vsPearDeck.teacherFree.lexiBody':
          'Free tier: up to 50 students per class for word-formation vocab games, plus classroom roster / named feedback disclosure and miss-gap → reteach Live. No Premium Teacher Dashboard gate for names.',
        'education.vsPearDeck.teacherFree.citePrefix': 'Pear Deck:',
        'education.vsPearDeck.teacherFree.citePlansLabel':
          'peardeck.com/pricing (Teacher Free vs Premium)',
        'education.vsPearDeck.teacherFree.citeHelpLabel':
          'Handling Inappropriate Responses (Free export / Premium Dashboard)',
        'education.vsPearDeck.teacherFree.citeSuffix':
          ' — Teacher Free: anonymous projector; names via spreadsheet export.',
        'education.vsPearDeck.teacherFree.cta':
          'Host whole-class free vocab with roster + named feedback (50-seat free limit)',
      };
      return map[key] || key;
    },
  }),
}));

describe('PearDeckTeacherFreeHonestyStrip', () => {
  it('renders Teacher Free named-response foil with LexiClash-only CTA and locked URLs', () => {
    const html = renderToStaticMarkup(<PearDeckTeacherFreeHonestyStrip locale="en" />);
    expect(html).toMatch(/peardeck-teacher-free-honesty-strip/);
    expect(html).toMatch(/anonymous projector|anonymously/);
    expect(html).toMatch(/spreadsheet export|export to spreadsheet/i);
    expect(html).toMatch(/Flashcard Factory/);
    expect(html).toMatch(/Teacher Dashboard|named feedback/i);
    expect(html).toMatch(/peardeck\.com\/pricing/);
    expect(html).toMatch(/handling-inappropriate-responses/);
    expect(html).not.toMatch(/lexiclash\.com/);
    const cta = html.match(/data-testid="peardeck-teacher-free-cta"[^>]*>([^<]+)/);
    expect(cta?.[1]).toMatch(/50|roster|named feedback/i);
    expect(cta?.[1]).not.toMatch(/spreadsheet|Flashcard Factory|Teacher Dashboard|Drawing|Draggable/);
  });
});
