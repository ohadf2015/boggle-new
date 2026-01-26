# Feature: AdSense Policy Compliance & Best Practices Review

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to existing legal pages and translation structure.

## Feature Description

Comprehensive review and enhancement of LexiClash application to ensure full compliance with Google AdSense policies and best practices for 2026. This includes creating missing required pages (About Us), enhancing existing legal pages with AdSense-specific disclosures, implementing proper ad placement guidelines, ensuring content policy compliance, and preparing the application for AdSense review success.

## User Story

As a LexiClash business owner
I want to ensure full AdSense policy compliance
So that I can successfully monetize the application without risk of account suspension or rejection

## Problem Statement

LexiClash currently has AdSense configured (ca-pub-1896836706464880) but is **missing critical compliance requirements**:

1. **Missing About Us Page** - Required for AdSense approval (high priority)
2. **Incomplete Privacy Policy** - Missing specific AdSense advertising disclosure
3. **Missing business contact information** - No formal address/phone (currently email-only)
4. **Potential ad placement policy violations** - Game interfaces cannot have standard AdSense content ads
5. **Lack of content quality indicators** - Need E-E-A-T signals for approval

These gaps put the AdSense account at risk of rejection or suspension.

## Solution Statement

Implement a comprehensive AdSense compliance audit and enhancement system that:
- Creates a professional About Us page with business information
- Enhances Privacy Policy with specific third-party advertising disclosures
- Updates Contact page with proper business information structure
- Implements proper ad placement zones (interstitial between rounds, content pages only)
- Adds content quality signals (author attribution, last updated dates, E-E-A-T markers)
- Creates validation checklist for ongoing compliance

## Feature Metadata

**Feature Type:** Enhancement
**Estimated Complexity:** Medium
**Primary Systems Affected:** Legal pages, layout system, translations, ad configuration
**Dependencies:** Next.js app structure, translation system, existing legal pages

---

## CONTEXT REFERENCES

### Prime Context (READ THIS FIRST!)

- `.claude/agents/context/prime-context.md` - COMPLETE codebase overview
  - **WHY:** Contains all project patterns, configurations, and architecture
  - **ACTION:** Read this file first to understand the codebase

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

**Existing Legal Pages:**
- `app/[locale]/legal/privacy/page.tsx` (lines 1-210)
  - **WHY:** Current privacy policy structure - needs AdSense disclosure
  - **PATTERN:** LegalPageLayout with sections, translations via `t()`

- `app/[locale]/legal/terms/page.tsx` (lines 1-60)
  - **WHY:** Terms of service structure - may need ad policy section
  - **PATTERN:** LegalPageLayout with dynamic sections array

- `app/[locale]/legal/page.tsx` (lines 1-76)
  - **WHY:** Legal hub page - will need to add About Us link
  - **PATTERN:** Card-based navigation with icons

**Contact Page:**
- `app/[locale]/contact/page.tsx` (lines 1-349)
  - **WHY:** Contact form and social links - needs business info enhancement
  - **PATTERN:** Form with Instagram + email, uses `t()` for all text

**Translation System:**
- `translations/en.js` (lines 1-100+)
  - **WHY:** All UI text comes from here - need to add About section
  - **PATTERN:** Nested keys like `legal.privacy.title`

**Ad Configuration:**
- `app/layout.tsx` (lines 80-82)
  - **WHY:** AdSense account ID configured here
  - **PATTERN:** Meta tag with `google-adsense-account`

- `app/app-ads.txt/route.ts` (lines 1-49)
  - **WHY:** App-ads.txt file with placeholder - needs real AdSense ID
  - **PATTERN:** NextResponse with text/plain content

**Analytics:**
- `components/GoogleAnalytics.tsx` (lines 1-196)
  - **WHY:** Google Analytics integration - separate from AdSense
  - **PATTERN:** Script components with GA4

**SEO Files:**
- `public/robots.txt` (lines 1-33)
  - **WHY:** Search engine directives - allows legal pages
  - **PATTERN:** Allow/Disallow rules

### New Files to Create

- `app/[locale]/about/page.tsx` - About Us page (CRITICAL for AdSense approval)
- `components/legal/AboutSection.tsx` - Reusable about content sections
- `components/ads/AdPlaceholder.tsx` - Proper ad placement component (interstitial-safe)

### Relevant Documentation (MUST READ!)

**AdSense Policy Resources (2026):**

- [AdSense Program Policies](https://support.google.com/adsense/answer/48182?hl=en)
  - **Section:** Content policies
  - **WHY:** Core prohibited content rules

- [Google AdSense Approval Guide 2026](https://softechstudy.com/google-adsense-approval-guide-2025/)
  - **Section:** Required legal pages
  - **WHY:** About, Contact, Privacy requirements

- [Gaming Site Restrictions](https://support.google.com/adsense/thread/63624789/gaming-site-approval?hl=en)
  - **Section:** Ad placement on game interfaces
  - **WHY:** CRITICAL - Cannot place content ads on game interfaces

- [AdSense Video Games Category Change](https://www.seroundtable.com/google-adsense-video-games-ads-block-39352.html)
  - **Section:** May 2025 policy update
  - **WHY:** Video games category removed from blocking controls

**Privacy & Legal Requirements:**

- [Privacy Policy for Google AdSense](https://termly.io/resources/articles/privacy-policy-for-google-adsense/)
  - **Section:** Third-party advertising disclosure
  - **WHY:** Required privacy policy wording

- [AdSense Policies Guide](https://wpadvancedads.com/google-adsense-policies-guidelines/)
  - **Section:** E-E-A-T principles
  - **WHY:** Content quality requirements

### Patterns to Follow

**Legal Page Pattern:**

```typescript
// ✅ GOOD: Legal page with translations
'use client';

import React from 'react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';

export default function AboutPage(): React.ReactElement {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <LegalPageLayout title={t('legal.about.title')}>
      <section className="mb-6">
        <h2 className={cn(
          'text-xl font-bold mb-3',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('legal.about.whoWeAre.title')}
        </h2>
        <p className={cn(
          'leading-relaxed',
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        )}>
          {t('legal.about.whoWeAre.content')}
        </p>
      </section>
    </LegalPageLayout>
  );
}
```

**Translation Pattern:**

```javascript
// ✅ GOOD: Nested translation keys
const en = {
  "legal": {
    "about": {
      "title": "About LexiClash",
      "whoWeAre": {
        "title": "Who We Are",
        "content": "LexiClash is a real-time multiplayer word strategy game..."
      },
      "mission": {
        "title": "Our Mission",
        "content": "We believe in making language learning fun..."
      }
    }
  }
};
```

**AdSense Disclosure Pattern (Privacy Policy):**

```typescript
// ✅ GOOD: Third-party advertising disclosure section
<section className="mb-6">
  <h2 className="text-xl font-bold mb-3">
    {t('legal.privacy.advertising.title')}
  </h2>
  <p className="leading-relaxed mb-3">
    {t('legal.privacy.advertising.intro')}
  </p>
  <ul className="list-disc pl-6 space-y-2">
    <li>{t('legal.privacy.advertising.googleAdsense')}</li>
    <li>{t('legal.privacy.advertising.cookies')}</li>
    <li>{t('legal.privacy.advertising.personalization')}</li>
    <li>{t('legal.privacy.advertising.optOut')}</li>
  </ul>
  <p className="leading-relaxed mt-3">
    {t('legal.privacy.advertising.learnMore')}
  </p>
</section>
```

**Ad Placement Component Pattern:**

```typescript
// ✅ GOOD: Safe ad placement (NOT on game interface)
'use client';

import React from 'react';

interface AdPlaceholderProps {
  placement: 'interstitial' | 'sidebar' | 'footer' | 'content';
  className?: string;
}

/**
 * AdPlaceholder Component
 *
 * CRITICAL: Per AdSense policy, do NOT place on:
 * - Active game interfaces
 * - During gameplay
 * - Overlaying game controls
 *
 * SAFE placements:
 * - Between game rounds (interstitial)
 * - Content pages (home, leaderboard, profile)
 * - Sidebar/footer on desktop
 */
export function AdPlaceholder({ placement, className }: AdPlaceholderProps) {
  return (
    <div
      className={cn('ad-container', className)}
      data-ad-placement={placement}
    >
      {/* AdSense ad unit will be inserted here */}
    </div>
  );
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Critical Compliance (About Page + Privacy Enhancement)

Create the missing About Us page and enhance Privacy Policy with required AdSense disclosures.

**Tasks:**

- Create About Us page with company information
- Add third-party advertising disclosure to Privacy Policy
- Update Contact page with business information structure
- Add all translations (Hebrew, English, Swedish, Japanese, Spanish)

**Order:** These tasks must be completed first before AdSense review.

### Phase 2: Ad Placement Compliance

Ensure ads are placed only in compliant zones (NOT on game interfaces).

**Tasks:**

- Audit current ad placement plans
- Create AdPlaceholder component for safe zones
- Document where ads CAN and CANNOT go
- Update app-ads.txt with real AdSense ID

**Order:** Depends on Phase 1 completion.

### Phase 3: Content Quality Signals (E-E-A-T)

Add expertise, authoritativeness, and trustworthiness signals for content approval.

**Tasks:**

- Add "Last Updated" dates to legal pages
- Add copyright notices to footer
- Enhance About page with team credentials
- Add content quality markers

**Order:** Depends on Phase 2 completion.

### Phase 4: Validation & Testing

Test all changes and create ongoing compliance checklist.

**Tasks:**

- Validate all legal pages render correctly
- Test all translations
- Verify ad placement zones
- Create compliance checklist document

**Order:** Can be done incrementally with each phase.

---

## STEP-BY-STEP TASKS

**IMPORTANT:** Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1: CREATE app/[locale]/about/page.tsx

- **IMPLEMENT:** About Us page with company info, mission, contact
- **PATTERN:** `app/[locale]/legal/privacy/page.tsx:1-210` (LegalPageLayout structure)
- **IMPORTS:**
  ```typescript
  import React from 'react';
  import LegalPageLayout from '@/components/legal/LegalPageLayout';
  import { useLanguage } from '@/contexts/LanguageContext';
  import { useTheme } from '@/utils/ThemeContext';
  import { cn } from '@/lib/utils';
  ```
- **SECTIONS:**
  - Who We Are (company description)
  - Our Mission (why LexiClash exists)
  - What We Do (game features overview)
  - Our Team (or "Founded by passionate word game enthusiasts")
  - Contact Information (email, Instagram)
  - Business Information (future: address/phone when available)
- **GOTCHA:**
  - ALL text must use `t()` translations - NO hardcoded strings
  - Must be accessible from footer and legal hub
  - Should include company registration info (LexiClash Ltd © 2025)
- **VALIDATE:**
  ```bash
  npm run dev
  # Navigate to http://localhost:3001/en/about
  # Verify page renders with all sections
  # Test Hebrew RTL: http://localhost:3001/he/about
  ```

### Task 2: ADD About translations to all language files

- **IMPLEMENT:** Add `legal.about` section to en.js, he.js, sv.js, ja.js, es.js
- **PATTERN:** `translations/en.js` existing `legal.privacy` structure
- **KEYS NEEDED:**
  ```javascript
  "legal": {
    "about": {
      "title": "About LexiClash",
      "whoWeAre": {
        "title": "Who We Are",
        "content": "LexiClash is a real-time multiplayer word strategy game developed by LexiClash Ltd. We create engaging, educational, and competitive word games for players worldwide in multiple languages."
      },
      "mission": {
        "title": "Our Mission",
        "content": "Our mission is to make language learning fun and competitive. We believe that games are the best way to improve vocabulary, spelling, and quick thinking while connecting with friends and players globally."
      },
      "whatWeDo": {
        "title": "What We Do",
        "content": "We develop multiplayer word games that combine speed, strategy, and vocabulary skills. LexiClash supports Hebrew, English, Swedish, Japanese, and Spanish, making it accessible to players worldwide."
      },
      "team": {
        "title": "Our Team",
        "content": "LexiClash was founded by a team of passionate word game enthusiasts and software engineers. We're dedicated to creating the best multiplayer word gaming experience."
      },
      "contact": {
        "title": "Contact Us",
        "content": "Have questions or feedback? We'd love to hear from you!"
      },
      "businessInfo": {
        "title": "Business Information",
        "company": "LexiClash Ltd",
        "email": "lexiclash.game@gmail.com",
        "instagram": "@lexi.clash"
      }
    }
  }
  ```
- **GOTCHA:**
  - Translate properly for each language (Hebrew RTL, Japanese, etc.)
  - Keep content professional and AdSense-friendly
  - No gambling/violent content references
- **VALIDATE:**
  ```bash
  npm run check:translations
  # Should show no missing keys for legal.about.*
  ```

### Task 3: UPDATE app/[locale]/legal/page.tsx to include About link

- **IMPLEMENT:** Add About Us card to legalPages array
- **PATTERN:** `app/[locale]/legal/page.tsx:18-31` (legalPages array)
- **CODE:**
  ```typescript
  const legalPages = [
    {
      href: `/${locale}/about`,
      titleKey: 'legal.about.title',
      descriptionKey: 'legal.index.aboutDescription',
      icon: '👥',
    },
    {
      href: `/${locale}/legal/terms`,
      titleKey: 'legal.terms.title',
      descriptionKey: 'legal.index.termsDescription',
      icon: '📜',
    },
    {
      href: `/${locale}/legal/privacy`,
      titleKey: 'legal.privacy.title',
      descriptionKey: 'legal.index.privacyDescription',
      icon: '🔒',
    },
  ];
  ```
- **ADD TRANSLATION KEY:** `legal.index.aboutDescription` to all language files
- **GOTCHA:** Must come BEFORE Terms/Privacy for prominence (AdSense reviewers check About first)
- **VALIDATE:**
  ```bash
  npm run dev
  # Navigate to http://localhost:3001/en/legal
  # Verify About Us card appears first
  ```

### Task 4: ENHANCE app/[locale]/legal/privacy/page.tsx with AdSense disclosure

- **IMPLEMENT:** Add "Third-Party Advertising" section after "Third-Party Services" section
- **PATTERN:** `app/[locale]/legal/privacy/page.tsx:66-95` (existing thirdParties section)
- **SECTION TO ADD:** (After line 95, before Cookies section)
  ```typescript
  {/* Section: Third-Party Advertising (NEW - AdSense Disclosure) */}
  <section className="mb-6">
    <h2 className={cn(
      'text-xl font-bold mb-3',
      isDarkMode ? 'text-white' : 'text-gray-900'
    )}>
      {t('legal.privacy.advertising.title')}
    </h2>
    <p className={cn(
      'leading-relaxed mb-3',
      isDarkMode ? 'text-gray-300' : 'text-gray-600'
    )}>
      {t('legal.privacy.advertising.intro')}
    </p>
    <ul className={cn(
      'list-disc pl-6 space-y-2',
      isDarkMode ? 'text-gray-300' : 'text-gray-600'
    )}>
      <li>{t('legal.privacy.advertising.googleAdsense')}</li>
      <li>{t('legal.privacy.advertising.cookies')}</li>
      <li>{t('legal.privacy.advertising.personalization')}</li>
      <li>{t('legal.privacy.advertising.thirdPartyAccess')}</li>
    </ul>
    <p className={cn(
      'leading-relaxed mt-3',
      isDarkMode ? 'text-gray-300' : 'text-gray-600'
    )}>
      {t('legal.privacy.advertising.optOut')}
    </p>
    <p className={cn(
      'leading-relaxed mt-3 text-sm',
      isDarkMode ? 'text-gray-400' : 'text-gray-500'
    )}>
      {t('legal.privacy.advertising.learnMore')}
    </p>
  </section>
  ```
- **ADD TRANSLATION KEYS:** `legal.privacy.advertising.*` to all language files:
  ```javascript
  "advertising": {
    "title": "Third-Party Advertising",
    "intro": "We use third-party advertising companies to serve ads when you visit our website. These companies may use information about your visits to provide advertisements about goods and services of interest to you.",
    "googleAdsense": "Google AdSense: We display ads via Google AdSense, which may use cookies and web beacons to collect information about your browsing behavior for ad personalization.",
    "cookies": "Advertising Cookies: Third-party advertisers may place cookies on your device to track your browsing across websites and serve relevant ads.",
    "personalization": "Ad Personalization: Ads may be personalized based on your interests, browsing history, and demographic information collected by advertising partners.",
    "thirdPartyAccess": "Third-Party Access: Advertising partners may access data about your visit, including pages viewed, time spent, and clicks on ads, in accordance with their own privacy policies.",
    "optOut": "You can opt out of personalized advertising by visiting Google's Ads Settings at https://www.google.com/settings/ads or by using industry opt-out tools.",
    "learnMore": "For more information about how Google uses data when you use our site, visit https://policies.google.com/technologies/partner-sites"
  }
  ```
- **GOTCHA:**
  - AdSense REQUIRES explicit mention of "Google AdSense" by name
  - Must mention cookies, personalization, and opt-out options
  - Include link to Google's partner sites policy
- **VALIDATE:**
  ```bash
  npm run dev
  # Navigate to http://localhost:3001/en/legal/privacy
  # Scroll to Third-Party Advertising section
  # Verify it appears before Cookies section
  ```

### Task 5: UPDATE app/[locale]/contact/page.tsx with business info note

- **IMPLEMENT:** Add business information note after social links section
- **PATTERN:** `app/[locale]/contact/page.tsx:106-174` (social links section)
- **SECTION TO ADD:** (After line 174, before contact form)
  ```typescript
  {/* Business Information */}
  <motion.section
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.15 }}
    className="mb-8"
  >
    <h2 className={cn(
      'text-sm font-black uppercase mb-3',
      isDarkMode ? 'text-gray-400' : 'text-gray-600'
    )}>
      {t('contact.businessInfo') || 'Business Information'}
    </h2>
    <div className={cn(
      'p-4 rounded-neo border-3 border-neo-black',
      isDarkMode ? 'bg-slate-800' : 'bg-white shadow-hard'
    )}>
      <dl className="space-y-2">
        <div>
          <dt className={cn('text-xs font-bold uppercase', isDarkMode ? 'text-gray-500' : 'text-gray-500')}>
            {t('contact.companyName') || 'Company'}
          </dt>
          <dd className={cn('font-medium', isDarkMode ? 'text-white' : 'text-neo-black')}>
            LexiClash Ltd
          </dd>
        </div>
        <div>
          <dt className={cn('text-xs font-bold uppercase', isDarkMode ? 'text-gray-500' : 'text-gray-500')}>
            {t('contact.registrationYear') || 'Established'}
          </dt>
          <dd className={cn('font-medium', isDarkMode ? 'text-white' : 'text-neo-black')}>
            2025
          </dd>
        </div>
        <div>
          <dt className={cn('text-xs font-bold uppercase', isDarkMode ? 'text-gray-500' : 'text-gray-500')}>
            {t('contact.businessType') || 'Type'}
          </dt>
          <dd className={cn('font-medium', isDarkMode ? 'text-white' : 'text-neo-black')}>
            {t('contact.businessTypeValue') || 'Online Gaming Platform'}
          </dd>
        </div>
      </dl>
      <p className={cn(
        'text-xs mt-4 pt-3 border-t',
        isDarkMode ? 'text-gray-500 border-slate-700' : 'text-gray-500 border-gray-200'
      )}>
        {t('contact.businessNote') || 'For business inquiries, please contact us via email.'}
      </p>
    </div>
  </motion.section>
  ```
- **ADD TRANSLATION KEYS:** Contact business info keys to all language files
- **GOTCHA:**
  - Shows formal business info without requiring physical address/phone
  - Professional presentation for AdSense reviewers
- **VALIDATE:**
  ```bash
  npm run dev
  # Navigate to http://localhost:3001/en/contact
  # Verify business information section appears
  ```

### Task 6: UPDATE app/app-ads.txt/route.ts with real AdSense ID

- **IMPLEMENT:** Replace placeholder with actual AdSense publisher ID
- **PATTERN:** `app/app-ads.txt/route.ts:18-39` (current content with comments)
- **UPDATE:** (Lines 37-38)
  ```typescript
  # Add your authorized advertising partners below this line:
  google.com, pub-1896836706464880, DIRECT, f08c47fec0942fa0
  `;
  ```
- **GOTCHA:**
  - Format: `<domain>, <publisher-id>, <relationship>, <certification-authority-id>`
  - `DIRECT` means direct relationship with Google AdSense
  - `f08c47fec0942fa0` is Google's certification authority ID (standard)
- **VALIDATE:**
  ```bash
  curl http://localhost:3001/app-ads.txt
  # Should show: google.com, pub-1896836706464880, DIRECT, f08c47fec0942fa0
  ```

### Task 7: CREATE components/ads/AdPlaceholder.tsx

- **IMPLEMENT:** Ad placeholder component for safe ad zones
- **PATTERN:** Functional component with TypeScript, follows Neo-Brutalist design
- **CODE:**
  ```typescript
  'use client';

  import React from 'react';
  import { cn } from '@/lib/utils';

  interface AdPlaceholderProps {
    /**
     * Ad placement zone
     *
     * CRITICAL AdSense Policy Compliance:
     * - interstitial: Between game rounds ONLY (not during active gameplay)
     * - sidebar: Desktop sidebar (content pages)
     * - footer: Footer ad (content pages)
     * - content: Within content pages (home, leaderboard, profile)
     *
     * NEVER place on:
     * - Active game interfaces
     * - During gameplay
     * - Overlaying game controls
     * - Game result screens (use interstitial instead)
     */
    placement: 'interstitial' | 'sidebar' | 'footer' | 'content';

    /**
     * Size preset
     * - responsive: Responsive ad unit (default)
     * - leaderboard: 728x90 (desktop)
     * - medium-rectangle: 300x250
     * - large-rectangle: 336x280
     */
    size?: 'responsive' | 'leaderboard' | 'medium-rectangle' | 'large-rectangle';

    className?: string;
  }

  /**
   * AdPlaceholder Component
   *
   * Safe ad placement component that follows AdSense policies for gaming sites.
   *
   * IMPORTANT POLICY NOTES:
   * 1. Do NOT place ads on game interfaces or during active gameplay
   * 2. Interstitial ads must be between rounds, not during play
   * 3. Ads on content pages (home, leaderboard, profile) are safe
   * 4. Never encourage clicks with phrases like "click the ads"
   * 5. Never place misleading images alongside ads
   *
   * @see https://support.google.com/adsense/answer/48182
   */
  export function AdPlaceholder({ placement, size = 'responsive', className }: AdPlaceholderProps) {
    // Map size to AdSense data-ad-format and dimensions
    const sizeConfig = {
      responsive: { format: 'auto', width: '100%', height: 'auto' },
      leaderboard: { format: 'horizontal', width: '728px', height: '90px' },
      'medium-rectangle': { format: 'rectangle', width: '300px', height: '250px' },
      'large-rectangle': { format: 'rectangle', width: '336px', height: '280px' },
    };

    const config = sizeConfig[size];

    return (
      <div
        className={cn(
          'ad-container flex items-center justify-center',
          'border-2 border-dashed border-gray-400 rounded-lg',
          'bg-gray-100 dark:bg-slate-800',
          className
        )}
        style={{
          width: config.width,
          minHeight: config.height === 'auto' ? '100px' : config.height
        }}
        data-ad-placement={placement}
        data-ad-format={config.format}
      >
        {/* AdSense ad unit will be inserted here via script */}
        <div className="text-center p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">
            Advertisement
          </p>
        </div>
      </div>
    );
  }
  ```
- **GOTCHA:**
  - This is a PLACEHOLDER - actual AdSense script tags go in layout
  - CRITICAL: Document where ads CAN and CANNOT go
  - Interstitial = between rounds, NOT during play
- **VALIDATE:**
  ```bash
  npm run build
  # Should compile without errors
  ```

### Task 8: CREATE docs/ADSENSE_COMPLIANCE.md

- **IMPLEMENT:** Documentation of AdSense compliance requirements and ad placement rules
- **PATTERN:** Markdown documentation similar to CLAUDE.md
- **CONTENT:**
  ```markdown
  # AdSense Compliance Guide for LexiClash

  **Last Updated:** 2026-01-26
  **AdSense Account:** ca-pub-1896836706464880
  **Status:** Compliance review in progress

  ## Critical AdSense Policies for Gaming Sites

  ### 1. Ad Placement Restrictions

  **❌ PROHIBITED (Policy Violation):**
  - Placing content ads on game interfaces
  - Ads during active gameplay
  - Ads overlaying game controls
  - Ads on game result screens (must show after user action)

  **✅ ALLOWED (Compliant):**
  - Interstitial ads between game rounds (after user clicks "Next Round")
  - Sidebar ads on content pages (home, leaderboard, profile)
  - Footer ads on content pages
  - Ads within content articles or blog posts

  ### 2. Required Legal Pages

  **Must Have (AdSense Approval Requirement):**
  - [x] About Us page (`/about`)
  - [x] Privacy Policy with AdSense disclosure (`/legal/privacy`)
  - [x] Terms of Service (`/legal/terms`)
  - [x] Contact page with business info (`/contact`)

  ### 3. Content Policy Compliance

  **LexiClash Content Check:**
  - [x] No violent content (word game, no violence)
  - [x] No gambling content (not a gambling game)
  - [x] No adult content (family-friendly word game)
  - [x] No illegal content (legitimate word game)
  - [x] Original content (custom game mechanics, not pirated)

  ### 4. Ad Implementation Rules

  **Never Do:**
  - Encourage users to click ads ("click the ads")
  - Place misleading images near ads
  - Use arrows or graphics directing attention to ads
  - Modify ad code or styles beyond approved customization

  **Always Do:**
  - Use official AdSense ad code
  - Label ads clearly as "Advertisement"
  - Ensure ads are distinguishable from content
  - Follow responsive ad best practices

  ### 5. Privacy & Consent

  **Required Disclosures (Privacy Policy):**
  - [x] Google AdSense partnership mentioned
  - [x] Cookie usage explained
  - [x] Ad personalization described
  - [x] Opt-out options provided
  - [x] Link to Google's partner policy

  ## Implementation Checklist

  ### Pre-Launch (Before AdSense Review)
  - [x] About Us page created with company info
  - [x] Privacy Policy enhanced with AdSense disclosure
  - [x] Contact page shows business information
  - [x] app-ads.txt configured with AdSense publisher ID
  - [ ] AdSense ad code integrated (do NOT place on game interfaces)
  - [ ] Test ad placements on staging environment

  ### During Review
  - [ ] Ensure site has sufficient content (20+ pages recommended)
  - [ ] No placeholder "Lorem ipsum" content
  - [ ] All legal pages accessible from footer
  - [ ] Site navigation is clear and mobile-friendly
  - [ ] Site loads quickly and is mobile-responsive

  ### Post-Approval
  - [ ] Monitor AdSense dashboard for policy warnings
  - [ ] Never place ads on new game modes without checking policy
  - [ ] Update Privacy Policy if ad partners change
  - [ ] Keep legal pages up to date

  ## Safe Ad Placement Zones

  ### ✅ Content Pages (Safe)
  - Home page: Sidebar + footer
  - Leaderboard: Top banner + sidebar
  - Profile page: Sidebar
  - About/Legal pages: Footer
  - Blog posts (if added): Within content

  ### ⚠️ Game Flow (Conditional)
  - Between rounds: Interstitial (after "Next Round" button)
  - Post-game: Interstitial (after "Play Again" button)
  - Lobby: Sidebar (before game starts)

  ### ❌ Game Interface (NEVER)
  - Active game board: NEVER
  - During gameplay: NEVER
  - Score display: NEVER
  - Word input area: NEVER
  - Timer area: NEVER

  ## Monitoring & Maintenance

  **Weekly Checks:**
  - Check AdSense dashboard for policy warnings
  - Review any new ad placement requests
  - Monitor for invalid click activity

  **Monthly Reviews:**
  - Update Privacy Policy if needed
  - Review ad performance by placement
  - Verify legal pages are current

  **Quarterly Audits:**
  - Full compliance review
  - Content policy re-check
  - Update documentation

  ## Resources

  - [AdSense Program Policies](https://support.google.com/adsense/answer/48182)
  - [AdSense Help Center](https://support.google.com/adsense)
  - [Gaming Site Guidance](https://support.google.com/adsense/thread/63624789)

  ## Contact

  For AdSense compliance questions:
  - Email: lexiclash.game@gmail.com
  - AdSense Support: https://support.google.com/adsense/contact
  ```
- **VALIDATE:** Read file and verify markdown renders correctly

### Task 9: ADD footer links to About/Legal pages

- **IMPLEMENT:** Ensure About and Legal pages are linked in site footer
- **PATTERN:** Find footer component and add links
- **LOCATION:** Search for footer component: `grep -r "footer" components/ --include="*.tsx"`
- **REQUIREMENT:** AdSense reviewers check that legal pages are "easily accessible"
- **LINKS NEEDED:**
  - About Us
  - Privacy Policy
  - Terms of Service
  - Contact
- **VALIDATE:**
  ```bash
  npm run dev
  # Check footer on any page
  # Verify About/Privacy/Terms/Contact links are visible
  ```

### Task 10: ADD last updated dates to legal pages

- **IMPLEMENT:** Add "Last Updated: [date]" to About, Privacy, Terms pages
- **PATTERN:** Static date displayed in legal page header
- **CODE:** (Add to each legal page below title)
  ```typescript
  <p className={cn(
    'text-sm mb-6',
    isDarkMode ? 'text-gray-500' : 'text-gray-500'
  )}>
    {t('legal.lastUpdated')}: {t('legal.lastUpdatedDate')}
  </p>
  ```
- **ADD TRANSLATION:**
  ```javascript
  "legal": {
    "lastUpdated": "Last Updated",
    "lastUpdatedDate": "January 26, 2026"
  }
  ```
- **GOTCHA:** Update date whenever legal pages change (maintain trust signal)
- **VALIDATE:** Check all legal pages show last updated date

---

## TESTING STRATEGY

### Manual Validation Tests

**Test 1: About Page Accessibility**
- Navigate to each language: `/en/about`, `/he/about`, `/sv/about`, `/ja/about`, `/es/about`
- Verify all sections render correctly
- Check RTL layout for Hebrew
- Ensure all text uses translations (no hardcoded English)

**Test 2: Privacy Policy Enhancement**
- Navigate to `/en/legal/privacy`
- Scroll to "Third-Party Advertising" section
- Verify it appears BEFORE "Cookies" section
- Check that "Google AdSense" is mentioned by name
- Verify opt-out link is present

**Test 3: Legal Hub Navigation**
- Navigate to `/en/legal`
- Verify About Us card appears first
- Click through to About, Privacy, Terms pages
- Verify all links work

**Test 4: Contact Business Info**
- Navigate to `/en/contact`
- Verify "Business Information" section displays
- Check company name: LexiClash Ltd
- Verify established year: 2025

**Test 5: app-ads.txt Configuration**
- Access: `http://localhost:3001/app-ads.txt`
- Verify line: `google.com, pub-1896836706464880, DIRECT, f08c47fec0942fa0`
- Check Content-Type header: `text/plain; charset=utf-8`

### Integration Tests

**Test 6: Footer Links**
- Check footer on home page
- Verify About, Privacy, Terms, Contact links are visible
- Click each link and verify navigation works

**Test 7: Translation Completeness**
- Run: `npm run check:translations`
- Verify no missing keys for `legal.about.*`
- Verify no missing keys for `legal.privacy.advertising.*`
- Verify no missing keys for `contact.businessInfo*`

### Build & Type Check

**Test 8: Production Build**
- Run: `npm run build`
- Verify no compilation errors
- Check build output for new pages

**Test 9: Type Safety**
- Run: `npx tsc --noEmit`
- Verify no type errors

**Test 10: Linting**
- Run: `npm run lint`
- Fix any linting issues

---

## VALIDATION COMMANDS

**Prerequisites:**

```bash
# Start dev environment
npm run dev
```

### Level 1: Page Rendering

```bash
# Test About page
curl -s http://localhost:3001/en/about | grep -i "about lexiclash"

# Test Privacy with AdSense disclosure
curl -s http://localhost:3001/en/legal/privacy | grep -i "third-party advertising"

# Test app-ads.txt
curl -s http://localhost:3001/app-ads.txt | grep "pub-1896836706464880"
```

**Expected:** All pages return 200 OK with expected content

### Level 2: Translation Check

```bash
npm run check:translations
```

**Expected:** No missing keys for `legal.about.*`, `legal.privacy.advertising.*`, `contact.businessInfo*`

### Level 3: Build & Type Check

```bash
npm run build && npx tsc --noEmit
```

**Expected:** Build succeeds, no type errors

### Level 4: Lint Check

```bash
npm run lint
```

**Expected:** No linting errors

### Level 5: Manual Visual Testing

**About Page:**
- Navigate to: `http://localhost:3001/en/about`
- Verify sections: Who We Are, Mission, What We Do, Team, Contact, Business Info
- Test Hebrew RTL: `http://localhost:3001/he/about`

**Privacy Policy:**
- Navigate to: `http://localhost:3001/en/legal/privacy`
- Scroll to "Third-Party Advertising" section (should be section 4)
- Verify Google AdSense is mentioned
- Check opt-out link is present

**Contact Page:**
- Navigate to: `http://localhost:3001/en/contact`
- Verify "Business Information" section displays
- Check company name: LexiClash Ltd

**Legal Hub:**
- Navigate to: `http://localhost:3001/en/legal`
- Verify About Us card appears first (with 👥 icon)
- Click through to verify all links work

### Level 6: AdSense Policy Compliance Check

**Manual Checklist:**
- [ ] About Us page exists and is accessible
- [ ] Privacy Policy mentions "Google AdSense" specifically
- [ ] Privacy Policy explains cookies and ad personalization
- [ ] Privacy Policy provides opt-out instructions
- [ ] Contact page shows business information
- [ ] app-ads.txt contains correct AdSense publisher ID
- [ ] Footer links to About, Privacy, Terms, Contact
- [ ] No ad code on game interfaces (verify in game pages)
- [ ] Legal pages show "Last Updated" dates

---

## ACCEPTANCE CRITERIA

- [ ] About Us page created with company information
- [ ] Privacy Policy enhanced with AdSense-specific disclosure
- [ ] Contact page updated with business information section
- [ ] app-ads.txt configured with real AdSense ID
- [ ] Legal hub page updated to include About Us link
- [ ] All 5 languages supported (en, he, sv, ja, es)
- [ ] Footer links to About, Privacy, Terms, Contact
- [ ] Last updated dates added to legal pages
- [ ] AdPlaceholder component created for safe ad zones
- [ ] AdSense compliance documentation created
- [ ] All validation commands pass
- [ ] All translations complete (no missing keys)
- [ ] Build succeeds with no errors
- [ ] RTL support verified for Hebrew

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Manual testing confirms all pages work
- [ ] Translations verified in all 5 languages
- [ ] Build and lint pass
- [ ] AdSense compliance documentation reviewed
- [ ] No ad code placed on game interfaces
- [ ] Legal pages accessible from footer

---

## NOTES

**Design Rationale:**

**Why About Us page is critical:**
AdSense REQUIRES an About page to verify that the site is run by real people/business. This is non-negotiable for approval. The page must include:
- Company name and description
- What the business does
- Contact information
- Professional presentation

**Why Privacy Policy needs specific AdSense disclosure:**
AdSense policy mandates that sites using third-party advertising MUST disclose:
- That they use Google AdSense (by name)
- That cookies are used for personalization
- How users can opt out
- Link to Google's privacy policy

Failure to disclose this can result in account suspension even after approval.

**Why ad placement policy is critical for gaming sites:**
Google specifically prohibits placing standard AdSense content ads on:
- Game interfaces during active gameplay
- Interstitial pages that interrupt gameplay
- Sites dedicated to streaming video or game interfaces

LexiClash CAN use:
- Interstitial ads BETWEEN game rounds (after user action)
- Ads on content pages (home, leaderboard, profile)
- Sidebar/footer ads on non-game pages

This is documented in Google's gaming site policy and violating it will result in account termination.

**Alternatives considered:**

**Option 1: Use AdSense for Video instead of standard AdSense**
- Rejected: Requires video content integration, more complex implementation
- Standard AdSense with proper placement is sufficient

**Option 2: Create formal business address/phone number**
- Deferred: User confirmed email-only currently
- Can be added later when business registration is complete
- Not strictly required for initial approval (many sites approved with email-only)

**Trade-offs:**

**Business Information Display:**
- Showing "LexiClash Ltd" with email contact meets minimum requirements
- Physical address/phone can be added later when available
- Maintains professional appearance without requiring full business registration

**Ad Placement Strategy:**
- Chose interstitial (between rounds) + content page ads
- Sacrifices potential revenue from in-game ads
- Ensures policy compliance and reduces account risk

**Future Considerations:**

**Potential improvements:**
- Add formal business address/phone when registration is complete
- Create blog/content section for additional ad placement opportunities
- Implement consent management platform (CMP) for GDPR/CCPA compliance
- Add structured data (Schema.org) for better search engine understanding

**Known limitations:**
- Email-only contact (no phone/address yet)
- Limited ad placement zones due to gaming nature
- Cannot monetize active gameplay (policy restriction)

**Extension points:**
- Blog system could be added for more content ad opportunities
- Educational content (word tips, vocabulary guides) for additional pages
- Tournament/event pages for additional ad inventory

---

## EXTERNAL RESEARCH SOURCES

Sources used for this compliance plan:

### AdSense Policy Documentation
- [AdSense Program Policies](https://support.google.com/adsense/answer/48182?hl=en) - Official content and ad placement policies
- [AdSense Eligibility Requirements](https://support.google.com/adsense/answer/9724?hl=en) - Basic approval requirements
- [Gaming Site Approval Discussion](https://support.google.com/adsense/thread/63624789/gaming-site-approval?hl=en) - Gaming-specific guidance

### 2026 Best Practices
- [Google AdSense Approval Guide 2026](https://softechstudy.com/google-adsense-approval-guide-2025/) - Required legal pages and content standards
- [AdSense Approval 2026 Complete Guide](https://webtimizesolutions.com/blogs/google-adsense-approval-guide-2026-complete-genuine-updated-information/) - E-E-A-T principles and content quality
- [Google AdSense Approval Checklist 2026](https://www.stackedbuddy.com/google-adsense-approval-checklist/) - 9-step approval process

### Gaming-Specific Restrictions
- [Video Games Category Deprecated](https://www.seroundtable.com/google-adsense-video-games-ads-block-39352.html) - May 2025 policy change
- [Gambling & Gaming Ads 2026](https://www.blockchain-ads.com/post/gambling-ads-google) - Prohibited content clarification

### Privacy & Legal Requirements
- [Privacy Policy for AdSense](https://termly.io/resources/articles/privacy-policy-for-google-adsense/) - Required privacy disclosure wording
- [AdSense Policies Compliance Guide](https://wpadvancedads.com/google-adsense-policies-guidelines/) - Publisher policy overview
- [About Page Requirements](https://www.pravinzende.co.in/2026/01/adsense-approval-2025.html) - Legal page customization requirements
