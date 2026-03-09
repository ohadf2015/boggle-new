# LexiClash SEO Content Plan for AdSense Approval

## Document Index

This directory contains comprehensive SEO analysis and content strategy for Google AdSense approval.

### Main Documents

1. **[seo-content-plan-adsense-approval.md](./seo-content-plan-adsense-approval.md)** ⭐ START HERE
   - Full 12,000+ word audit
   - Current state analysis
   - 3-phase implementation plan (12 weeks)
   - Word count projections
   - SEO best practices
   - Approval checklists

2. **[../ADSENSE_CONTENT_QUICK_START.md](../ADSENSE_CONTENT_QUICK_START.md)** ⚡ EXECUTIVE SUMMARY
   - 2,000 word quick reference
   - 3 critical guides to build first
   - Implementation checklist
   - Timeline & next actions

---

## Quick Facts

### Current State
- **Total Content:** ~25,000-30,000 words
- **Blog Posts:** 6 (3,000-4,000 words each)
- **Status:** 80% ready for AdSense
- **Main Risk:** "Thin content" rejection

### Target State
- **Total Content:** 50,000+ words
- **Timeline:** 12 weeks across 3 phases
- **Status:** 100% AdSense-approved

### Critical Gaps (Phase 1 Priority)
1. ❌ No beginner's guide (need 2,500-3,000 words)
2. ❌ No word game glossary (need 2,000-2,500 words)
3. ❌ No daily strategy guide (need 2,000-2,500 words)

---

## Phase Breakdown

### Phase 1: Critical Additions (Weeks 1-4)
**Goal:** Add 8,000 words → Reach 38,000 total

- [ ] Beginner's Guide to LexiClash (2,500-3,000 words)
- [ ] Word Game Glossary (2,000-2,500 words)
- [ ] Daily Challenge Strategy (2,000-2,500 words)

**Result:** ~80% AdSense readiness

### Phase 2: Content Expansion (Weeks 5-8)
**Goal:** Add 8,500 words → Reach 46,500 total

- [ ] 7-Day Word Game Crash Course (2,500-3,000 words)
- [ ] Multilingual Word Learning Tips (2,000-2,500 words)
- [ ] Competitive Play Guide (2,500-3,000 words)

**Result:** ~90% AdSense readiness

### Phase 3: Authority & E-E-A-T (Weeks 9-12)
**Goal:** Add 8,500 words → Reach 55,000 total

- [ ] Research Blog Series (3,000-4,000 words)
- [ ] Author Authority Pages (1,000-1,500 words)
- [ ] Player Case Studies (2,000-3,000 words)

**Result:** ✅ 100% AdSense-ready

---

## Existing Content Assets (Don't Delete)

### Blog Posts
- ✅ 10-surprising-benefits-word-games
- ✅ science-behind-word-games
- ✅ daily-challenge-strategies
- ✅ multilingual-word-learning
- ✅ top-player-secrets
- ✅ improve-word-game-skills

### Educational Pages
- ✅ `/rules/` - How to Play (with schema)
- ✅ `/about/` - Company authority
- ✅ `/faq/` - User Q&A
- ✅ `/legal/` - Privacy, Terms, Cookies

### Sitemap
- ✅ Proper multilingual structure (5 languages)
- ✅ hreflang tags implemented
- ✅ Correct priorities assigned

---

## Implementation Checklist

### Setup (Week 1)
- [ ] Read full plan: `seo-content-plan-adsense-approval.md`
- [ ] Create `/app/[locale]/guides/` folder
- [ ] Create folder structure for 3 guides
- [ ] Set up content calendar

### Phase 1 Content (Weeks 1-4)
- [ ] Write Beginner's Guide (2,500-3,000 words)
- [ ] Translate to EN, HE, SV, JA, ES
- [ ] Create Glossary items (50-75 terms)
- [ ] Write Daily Challenge Strategy
- [ ] Add schema markup (HowTo, FAQPage)
- [ ] Internal link all guides
- [ ] Update sitemap.js

### QA & Launch (Week 4)
- [ ] Test on mobile & desktop
- [ ] Grammar/spelling check
- [ ] SEO check (titles, meta, H1s)
- [ ] Link check (no 404s)
- [ ] Submit sitemap to GSC

### Tracking (Ongoing)
- [ ] Monitor Search Console
- [ ] Track organic traffic
- [ ] Measure engagement metrics
- [ ] Plan Phase 2 content

---

## File Locations

### Blog Template (Reuse This)
- Component: `/app/[locale]/blog/PageClient.tsx`
- Content pattern: `/app/[locale]/blog/[slug]/content.ts`
- Example: `/app/[locale]/blog/10-surprising-benefits-word-games/content.ts`

### Where to Add New Content
- Guides: `/app/[locale]/guides/[slug]/`
- Sitemap: `/app/sitemap.js` (lines 216+)
- Layout: `/app/[locale]/layout.tsx` (metadata)

### Design System
- Neo-brutalist styling: Use existing Tailwind config
- Shadows: `shadow-hard*` utilities
- Colors: `neo-yellow`, `neo-lime`, `neo-black`
- Typography: Fredoka (display), Rubik (body)

---

## SEO Keywords to Target

### Phase 1 Keywords
- "how to play word games"
- "word game for beginners"
- "scrabble terms"
- "daily challenge strategy"

### Phase 2 Keywords
- "word game course"
- "language learning games"
- "word game competition"

### Phase 3 Keywords
- "improve word game skills"
- "cognitive benefits of word games"
- "player interviews"

---

## AdSense Approval Strategy

### When to Resubmit
1. **After Phase 1:** 38,000+ words (show good faith effort)
2. **After Phase 2:** 46,500+ words (strong content library)
3. **After Phase 3:** 55,000+ words (comprehensive authority)

### Compliance Requirements
- ✅ 40,000+ unique words
- ✅ Original, well-written content
- ✅ Proper schema markup
- ✅ Mobile-friendly
- ✅ Fast page speed
- ✅ Privacy policy visible
- ✅ Contact page functional
- ✅ Content-first, ads secondary

---

## Word Count Goals

| Phase | Timeline | New Words | Cumulative | Status |
|-------|----------|-----------|-----------|--------|
| Current | Live | — | ~30,000 | ⚠️ Borderline |
| Phase 1 | Week 4 | +8,000 | 38,000 | 🟡 Good |
| Phase 2 | Week 8 | +8,500 | 46,500 | 🟢 Very Good |
| Phase 3 | Week 12 | +8,500 | 55,000 | ✅ Excellent |

---

## Important Notes

### Don't Delete Existing Content
All 6 blog posts are high-quality, research-backed, and multilingual. They form the foundation of AdSense approval.

### Reuse Components
The blog structure (`PageClient.tsx` + `content.ts` pattern) is battle-tested. Use it for all new guides.

### Localization is Required
All new content must support 4+ languages: EN, HE, SV, JA, ES. Use the same content.ts pattern as blogs.

### Schema Markup Matters
- Blog posts: Use `BlogPosting` schema
- Guides: Use `HowTo` or `FAQPage` schema
- Glossary: Use `FAQPage` schema for items

---

## Risk Mitigation

### If "Thin Content" Rejection
1. Immediately build Phase 1 guides (+8,000 words)
2. Resubmit with content map
3. Timeline: 2-3 weeks

### If Policy Violation (Health Claims)
1. Add disclaimer on blog posts about brain benefits
2. Clarify anecdotal vs. clinical evidence
3. Timeline: 1 week

### If Page Speed Issues
1. Optimize images (WebP format, <200KB)
2. Lazy-load ads
3. Enable caching headers

---

## Getting Started

### This Week
1. Read: `seo-content-plan-adsense-approval.md`
2. Review: `ADSENSE_CONTENT_QUICK_START.md`
3. Create: `/app/[locale]/guides/` folder structure
4. Draft: Beginner's Guide outline (2,500 words)

### Week 2
- Begin writing Beginner's Guide
- Start Glossary terms list
- Set up content calendar

### Week 3-4
- Complete Phase 1 guides
- Translate to 4+ languages
- Add schema markup
- Internal link everything

---

## Contact & Questions

For questions about this SEO plan:
1. Check the full document: `seo-content-plan-adsense-approval.md`
2. Review the quick start: `ADSENSE_CONTENT_QUICK_START.md`
3. Reference blog examples: `/app/[locale]/blog/`

---

**Last Updated:** March 9, 2026
**Plan Duration:** 12 weeks
**Target Completion:** June 2026

