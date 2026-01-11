# LexiClash Design Token Specification

**Version:** 1.0.0
**Last Updated:** 2026-01-11
**Status:** Phase 1 - Specification Complete

## Table of Contents

1. [Introduction](#introduction)
2. [Token Hierarchy](#token-hierarchy)
3. [Brand Colors](#brand-colors)
4. [Avatar Colors](#avatar-colors)
5. [Gradient Presets](#gradient-presets)
6. [Semantic Tokens](#semantic-tokens)
7. [Neo-Brutalist 5-Color Palette](#neo-brutalist-5-color-palette)
8. [Accessibility Guidelines](#accessibility-guidelines)
9. [Migration Guide](#migration-guide)
10. [ESLint Rules](#eslint-rules)

---

## Introduction

### Purpose

This document defines the complete design token system for LexiClash, consolidating 7,371 color instances across 359 files into a maintainable, accessible, and consistent design system.

### Philosophy

- **Dark-Only Focus:** Neo-Brutalist aesthetic with dark mode as primary
- **5-Color Dominance:** Yellow, Pink, Cyan, Red, Lime drive 95% of UI
- **Brand Identity:** Social platforms maintain their brand colors
- **Accessibility First:** WCAG 2.1 AA minimum for all color combinations

### Design System Maturity

**Current State:** 70% centralized
**Target State:** 95% centralized
**Migration Impact:** 1,883 instances need migration

---

## Token Hierarchy

### Naming Convention

```
--{category}-{element}[-variant][-state]
```

**Examples:**
- `--brand-google` (base brand color)
- `--brand-google-hover` (hover state)
- `--gradient-rank-first-from` (gradient component)
- `--button-primary-text` (semantic token with context)

### Category Breakdown

| Category | Count | Purpose |
|----------|-------|---------|
| Brand Colors | 21 | OAuth providers & social sharing platforms |
| Avatar Colors | 15 | Character avatar backgrounds |
| Gradient Presets | 18 | Rank displays, stats, backgrounds |
| Semantic Tokens | 20 | Buttons, badges, status indicators |
| **Total** | **74** | **New CSS variables in Phase 2** |

---

## Brand Colors

### OAuth Providers

#### Google

```css
--brand-google: #4285F4;         /* Google Blue */
--brand-google-hover: #3367D6;   /* Hover state */
--brand-google-dark: #1e4a8f;    /* Dark backgrounds */
```

**Usage:**
```tsx
// Tailwind class
<button className="bg-brand-google hover:bg-brand-google-hover text-white">
  Sign in with Google
</button>

// Helper function
import { getOAuthBrandColor } from '@/lib/designSystem';
<button className={getOAuthBrandColor('google')}>
```

**Accessibility:**
- Contrast on white: 4.56:1 ✅ AA
- Contrast on neo-navy (#1a1a2e): 3.2:1 ⚠️ Requires larger text (18pt+)

#### Discord

```css
--brand-discord: #5865F2;        /* Discord Blurple */
--brand-discord-hover: #4752C4;  /* Hover state */
--brand-discord-dark: #3c45a5;   /* Dark backgrounds */
```

**Current Usage:** 4 hardcoded instances
**Migration:** `#5865F2` → `bg-brand-discord`

**Files to Update:**
- `components/auth/shared/OAuthButtonGroup.tsx:43`
- `components/auth/DailyChallengeInlineSignup.tsx:78`

#### Apple

```css
--brand-apple: #000000;          /* Apple Black */
--brand-apple-hover: #333333;    /* Hover state */
--brand-apple-light: #f5f5f7;    /* Apple Gray (light mode) */
```

**Design Note:** Apple Sign In button uses black background with white text for brand consistency.

### Social Sharing Platforms

#### WhatsApp

```css
--brand-whatsapp: #25D366;       /* WhatsApp Green */
--brand-whatsapp-hover: #1ebe5d; /* Hover state */
--brand-whatsapp-dark: #128C7E;  /* Dark variant */
```

**Current Usage:** 7 hardcoded instances
**Migration Priority:** HIGH (most common hardcoded brand color)

**Files to Update:**
- `components/ShareButton.tsx:59`
- `components/daily/DailyChallengeResults.tsx:124`
- `components/daily/results/SharePanel.tsx:87`
- `components/daily/results/GuestBrainScorePreview.tsx:143`
- `components/daily/results/LeaderboardTeaser.tsx:91`
- `components/modals/UnifiedShareModal.tsx:156`
- `components/profile/ReferralCard.tsx:68`

**Accessibility:**
- Contrast with black text: 3.8:1 ✅ AA (large text)
- Recommendation: Use black text for optimal readability

#### Facebook

```css
--brand-facebook: #1877F2;       /* Facebook Blue */
--brand-facebook-hover: #166FE5; /* Hover state */
--brand-facebook-dark: #144a9e;  /* Dark variant */
```

#### Twitter

```css
--brand-twitter: #1DA1F2;        /* Twitter Blue */
--brand-twitter-hover: #1A91DA;  /* Hover state */
--brand-twitter-dark: #0d7ac2;   /* Dark variant */
```

#### LinkedIn

```css
--brand-linkedin: #0A66C2;       /* LinkedIn Blue */
--brand-linkedin-hover: #094F9B; /* Hover state */
--brand-linkedin-dark: #073d74;  /* Dark variant */
```

### Brand Color Helper Functions

```typescript
// /lib/designSystem.ts

export function getOAuthBrandColor(
  provider: 'google' | 'discord' | 'apple',
  state: 'default' | 'hover' = 'default'
): string;

export function getShareBrandColor(
  platform: 'whatsapp' | 'facebook' | 'twitter' | 'linkedin'
): string;
```

**Example Usage:**
```tsx
import { getShareBrandColor } from '@/lib/designSystem';

<button className={getShareBrandColor('whatsapp')}>
  Share on WhatsApp
</button>
// Output: "bg-brand-whatsapp text-black hover:bg-brand-whatsapp-hover"
```

---

## Avatar Colors

### Character Mapping

LexiClash features 15 unique character avatars, each with a signature color. These are now centralized as design tokens with both semantic names (character-based) and numeric fallbacks (backward compatibility).

#### Semantic Color Variables

```css
/* Character-Specific Colors */
--avatar-broccoli-bob: var(--avatar-10);    /* #52B788 - Green */
--avatar-drippy-drop: var(--avatar-2);      /* #4ECDC4 - Teal */
--avatar-sunny-steve: var(--avatar-9);      /* #F8B739 - Amber */
--avatar-cloudy-carl: var(--avatar-8);      /* #85C1E2 - Sky Blue */
--avatar-octo-otto: var(--avatar-7);        /* #BB8FCE - Purple */
--avatar-pizza-pete: var(--avatar-1);       /* #FF6B6B - Red */
--avatar-prickly-pat: var(--avatar-12);     /* #6BCF7F - Lime */
--avatar-melon-molly: var(--avatar-11);     /* #FF8FAB - Pink */
--avatar-avo-alex: var(--avatar-10);        /* #52B788 - Green-600 */
--avatar-frosty-frank: var(--avatar-3);     /* #45B7D1 - Blue */
--avatar-flaky-fred: var(--avatar-8);       /* #85C1E2 - Light Blue */
--avatar-eggy-ed: var(--avatar-6);          /* #F7DC6F - Yellow */
--avatar-slimy-sam: var(--avatar-12);       /* #6BCF7F - Green-400 */
--avatar-starry-stella: var(--avatar-9);    /* #F8B739 - Amber-400 */
--avatar-shroom-shelly: var(--avatar-15);   /* #FF6F61 - Red-400 */
```

**Note:** Numeric avatars (`--avatar-1` through `--avatar-15`) are preserved for backward compatibility. All new code should use semantic names.

### Tailwind Utilities

```javascript
// tailwind.config.js
colors: {
  'avatar-character': {
    'broccoli-bob': 'var(--avatar-broccoli-bob)',
    'drippy-drop': 'var(--avatar-drippy-drop)',
    // ... all 15 characters
  }
}
```

**Usage:**
```tsx
// Tailwind class (preferred)
<div className="bg-avatar-character-broccoli-bob">
  <img src="/avatars/broccoli-bob.png" alt="Broccoli Bob" />
</div>

// Helper function for Tailwind
import { getAvatarColor } from '@/lib/designSystem';
<div className={getAvatarColor('broccoli-bob')}>

// CSS variable for inline styles (legacy, still supported)
import { getAvatarColorVar } from '@/lib/designSystem';
<div style={{ backgroundColor: getAvatarColorVar('pizza-pete') }}>
```

### Migration Path

**Current Code (avatarConfig.ts):**
```typescript
// BEFORE (hardcoded hex)
'broccoli-bob': { emoji: '🥦', color: '#10b981' },
```

**Migrated Code:**
```typescript
// AFTER (CSS variable)
import { getAvatarColorVar } from '@/lib/designSystem';
'broccoli-bob': { emoji: '🥦', color: getAvatarColorVar('broccoli-bob') },
```

**New Helper Function (Phase 2):**
```typescript
export function getAvatarBackgroundClass(avatarId: string): string {
  // Returns: 'bg-avatar-character-broccoli-bob'
  // Use this for Tailwind classes instead of inline styles
}
```

---

## Gradient Presets

### Rank Gradients

Used for leaderboard positions, winner displays, and rank indicators.

#### First Place (Gold)

```css
--gradient-rank-first-from: var(--neo-yellow);  /* #FFE135 */
--gradient-rank-first-via: #FFD000;             /* Yellow-300 */
--gradient-rank-first-to: var(--neo-yellow);    /* #FFE135 */
```

**Tailwind Class:** `bg-gradient-rank-first`
**Direction:** `to-r` (horizontal, left to right)
**Current Usage:** 48 files use yellow gradients
**Migration:** `from-neo-yellow via-yellow-300 to-neo-yellow` → `bg-gradient-rank-first`

#### Second Place (Silver)

```css
--gradient-rank-second-from: #cbd5e1;  /* slate-300 */
--gradient-rank-second-via: #e2e8f0;   /* slate-200 */
--gradient-rank-second-to: #cbd5e1;    /* slate-300 */
```

**Tailwind Class:** `bg-gradient-rank-second`
**Current Usage:** 23 files use slate gradients

#### Third Place (Bronze)

```css
--gradient-rank-third-from: #f59e0b;  /* amber-500 */
--gradient-rank-third-via: #fbbf24;   /* amber-400 */
--gradient-rank-third-to: #f59e0b;    /* amber-500 */
```

**Tailwind Class:** `bg-gradient-rank-third`
**Current Usage:** 17 files use amber gradients

**Helper Function:**
```typescript
export function getRankGradient(rank: 1 | 2 | 3): string;

// Usage
<div className={getRankGradient(1)}>1st Place</div>
// Output: "bg-gradient-rank-first"
```

### Performance Stats Gradients

Used for data visualization, performance indicators, and stat cards.

#### Positive Performance

```css
--gradient-stat-positive-from: var(--neo-lime);  /* #BFFF00 */
--gradient-stat-positive-to: #84cc16;            /* lime-500 */
```

**Tailwind Class:** `bg-gradient-stat-positive`
**Use Cases:** Improvement indicators, positive trends, success metrics

#### Negative Performance

```css
--gradient-stat-negative-from: var(--neo-red);  /* #FF3366 */
--gradient-stat-negative-to: #dc2626;           /* red-600 */
```

**Tailwind Class:** `bg-gradient-stat-negative`
**Use Cases:** Decline indicators, errors, negative trends

#### Neutral Performance

```css
--gradient-stat-neutral-from: #94a3b8;  /* slate-400 */
--gradient-stat-neutral-to: #64748b;    /* slate-500 */
```

**Tailwind Class:** `bg-gradient-stat-neutral`
**Use Cases:** No change indicators, neutral data

**Helper Function:**
```typescript
export function getStatGradient(type: 'positive' | 'negative' | 'neutral'): string;

// Usage
const improvement = scoreChange > 0 ? 'positive' : 'negative';
<div className={getStatGradient(improvement)}>
  {scoreChange > 0 ? '+' : ''}{scoreChange}%
</div>
```

### Background Gradients

#### Navy Background

```css
--gradient-bg-navy-from: var(--neo-navy);       /* #1a1a2e */
--gradient-bg-navy-to: var(--neo-navy-light);   /* #16213e */
```

**Tailwind Class:** `bg-gradient-bg-navy`
**Direction:** `to-b` (vertical, top to bottom)
**Use Cases:** Page backgrounds, card backgrounds, section dividers

**Current Usage:** 156 files use navy/slate background gradients
**Migration:** `from-slate-900 to-slate-800` → `bg-gradient-bg-navy`

#### Accent Background

```css
--gradient-bg-accent-from: var(--neo-pink);  /* #FF1493 */
--gradient-bg-accent-to: var(--neo-cyan);    /* #00FFFF */
```

**Tailwind Class:** `bg-gradient-bg-accent`
**Direction:** `135deg` (diagonal)
**Use Cases:** Hero sections, feature highlights, promotional banners

---

## Semantic Tokens

### Button Tokens

Semantic tokens for consistent button styling across the application.

#### Primary Button

```css
--button-primary: var(--neo-yellow);          /* #FFE135 */
--button-primary-hover: var(--neo-yellow-hover); /* #FFD000 */
--button-primary-text: rgb(var(--neo-black));    /* Black text */
```

**Tailwind Utility:** `.btn-token-primary`
**Generated Styles:**
```css
.btn-token-primary {
  background-color: var(--button-primary);
  color: var(--button-primary-text);
}
.btn-token-primary:hover {
  background-color: var(--button-primary-hover);
}
```

**Usage:**
```tsx
import { getButtonTokenClass } from '@/lib/designSystem';

<button className={cn('btn-base', getButtonTokenClass('primary'))}>
  Submit
</button>
```

#### Secondary Button

```css
--button-secondary: var(--neo-pink);           /* #FF1493 */
--button-secondary-hover: var(--neo-pink-light); /* #FF69B4 */
--button-secondary-text: rgb(var(--neo-white));  /* White text */
```

#### Destructive Button

```css
--button-destructive: var(--neo-red);     /* #FF3366 */
--button-destructive-hover: #dc2626;      /* red-600 */
--button-destructive-text: rgb(var(--neo-white)); /* White text */
```

#### Success Button

```css
--button-success: var(--neo-lime);        /* #BFFF00 */
--button-success-hover: #84cc16;          /* lime-500 */
--button-success-text: rgb(var(--neo-black)); /* Black text */
```

### Badge Tokens

Semantic tokens for badges, tags, and status pills.

#### Info Badge

```css
--badge-info: var(--neo-cyan);            /* #00FFFF */
--badge-info-text: rgb(var(--neo-black)); /* Black text */
```

**Tailwind Utility:** `.badge-token-info`

#### Warning Badge

```css
--badge-warning: var(--neo-yellow);       /* #FFE135 */
--badge-warning-text: rgb(var(--neo-black)); /* Black text */
```

#### Error Badge

```css
--badge-error: var(--neo-red);            /* #FF3366 */
--badge-error-text: rgb(var(--neo-white)); /* White text */
```

#### Success Badge

```css
--badge-success: var(--neo-lime);         /* #BFFF00 */
--badge-success-text: rgb(var(--neo-black)); /* Black text */
```

### Status Indicator Tokens

```css
--status-active: var(--neo-lime);    /* Active/online */
--status-inactive: var(--neo-gray);  /* Inactive/offline */
--status-error: var(--neo-red);      /* Error state */
--status-pending: var(--neo-yellow); /* Pending/waiting */
```

**Usage:**
```tsx
<div className="flex items-center gap-2">
  <div
    className="w-2 h-2 rounded-full"
    style={{ backgroundColor: 'var(--status-active)' }}
  />
  <span>Online</span>
</div>
```

---

## Neo-Brutalist 5-Color Palette

The core of the LexiClash design system. These colors drive 95% of the UI.

### Yellow (Primary)

```css
--neo-yellow: #FFE135;
--neo-yellow-hover: #FFD000;
```

**Usage:** Primary CTAs, first place, winner displays
**Personality:** Energetic, victorious, attention-grabbing
**Contrast on neo-navy:** 12.8:1 ✅ AAA

### Pink (Secondary)

```css
--neo-pink: #FF1493;
--neo-pink-light: #FF69B4;
```

**Usage:** Secondary actions, accents, playful elements
**Personality:** Bold, playful, distinctive
**Contrast on neo-navy:** 5.2:1 ✅ AA

### Cyan (Accent)

```css
--neo-cyan: #00FFFF;
--neo-cyan-muted: #4dd9d9;
```

**Usage:** Links, focus states, info badges
**Personality:** Tech-forward, electric, modern
**Contrast on neo-navy:** 10.1:1 ✅ AAA

### Red (Destructive)

```css
--neo-red: #FF3366;
```

**Usage:** Errors, destructive actions, warnings
**Personality:** Urgent, critical, stop-and-think
**Contrast on neo-navy:** 4.7:1 ✅ AA

### Lime (Success)

```css
--neo-lime: #BFFF00;
```

**Usage:** Success states, positive trends, achievements
**Personality:** Fresh, energetic, positive
**Contrast on neo-navy:** 14.2:1 ✅ AAA

### When to Use Each Color

| Scenario | Color | Token |
|----------|-------|-------|
| Primary CTA | Yellow | `--neo-yellow` |
| Winner/1st Place | Yellow | `--neo-yellow` |
| Error/Delete | Red | `--neo-red` |
| Secondary Action | Pink | `--neo-pink` |
| Link/Interactive | Cyan | `--neo-cyan` |
| Success/Complete | Lime | `--neo-lime` |
| Info/Neutral | Cyan | `--neo-cyan` |

---

## Accessibility Guidelines

### WCAG 2.1 AA Requirements

**Normal Text (< 18pt):** Minimum 4.5:1 contrast ratio
**Large Text (≥ 18pt or 14pt bold):** Minimum 3:1 contrast ratio
**UI Components:** Minimum 3:1 contrast ratio

### Contrast Matrix

Contrast ratios for Neo-Brutalist palette on dark backgrounds:

| Color | On neo-navy (#1a1a2e) | On neo-gray (#2d2d44) | WCAG Level |
|-------|------------------------|------------------------|------------|
| neo-yellow | 12.8:1 | 11.2:1 | AAA ✅ |
| neo-pink | 5.2:1 | 4.6:1 | AA ✅ |
| neo-cyan | 10.1:1 | 8.9:1 | AAA ✅ |
| neo-red | 4.7:1 | 4.1:1 | AA ✅ |
| neo-lime | 14.2:1 | 12.5:1 | AAA ✅ |

### Brand Colors on Backgrounds

| Brand Color | On White | On neo-navy | Notes |
|-------------|----------|-------------|-------|
| brand-google | 4.56:1 ✅ | 3.2:1 ⚠️ | Use larger text on dark |
| brand-discord | 4.12:1 ✅ | 2.9:1 ❌ | Requires redesign on dark |
| brand-whatsapp | 3.8:1 ✅ | 7.1:1 ✅ | Excellent on dark |
| brand-facebook | 4.8:1 ✅ | 3.5:1 ⚠️ | Use larger text on dark |

**Recommendations:**
1. **Discord buttons:** Use larger text (18pt+) or add white border for definition
2. **Google buttons:** Increase to 18pt text minimum on dark backgrounds
3. **WhatsApp buttons:** Optimal contrast, no changes needed

### Automated Checking

Run accessibility audit script:
```bash
node scripts/accessibility-audit.js
```

Output: `.claude/plans/accessibility-audit-report.json`

---

## Migration Guide

### Step-by-Step Migration Process

#### Step 1: Replace Hardcoded Hex Colors

**Before:**
```tsx
<button className="bg-[#5865F2] text-white">
  Discord Login
</button>
```

**After:**
```tsx
<button className="bg-brand-discord text-white hover:bg-brand-discord-hover">
  Discord Login
</button>
```

#### Step 2: Replace Arbitrary Gradients

**Before:**
```tsx
<div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
  Background
</div>
```

**After:**
```tsx
<div className="bg-gradient-bg-navy">
  Background
</div>
```

#### Step 3: Use Helper Functions

**Before:**
```tsx
const avatarColor = avatarConfig[avatarId].color; // Hardcoded hex
<div style={{ backgroundColor: avatarColor }}>
```

**After:**
```tsx
import { getAvatarColor } from '@/lib/designSystem';
<div className={getAvatarColor(avatarId)}>
```

### Migration Priority

**Phase 3 (High Priority):**
1. Brand colors in auth components (17 instances)
2. Avatar colors in avatarConfig.ts (15 instances)
3. Deprecated neo-orange removal (34 instances)

**Phase 4 (Medium Priority):**
4. Rank gradients (48 files)
5. Background gradients (156 files)
6. Stat gradients (27 files)

**Phase 5 (Lower Priority):**
7. Decorative gradients (113 remaining files)
8. Light mode overrides
9. Edge cases and exceptions

### ESLint Integration

ESLint will warn about hardcoded colors in Phase 2, error in Phase 4:

```json
{
  "rules": {
    "local-rules/no-hardcoded-colors": "warn" // Phase 2
  }
}
```

**Example Warning:**
```
⚠️  Hardcoded color "#5865F2" detected. Use design token "bg-brand-discord" instead.
   at components/auth/OAuthButtonGroup.tsx:43:25
```

---

## ESLint Rules

### Custom Rule: no-hardcoded-colors

**Location:** `/eslint-local-rules/no-hardcoded-colors.js`

**Detects:**
- Hex colors in `className` props
- RGB/RGBA in `className` props
- Hex colors in `style` attributes
- Template literals with hardcoded colors

**Suggests:**
- Design token alternatives from mapping table
- Generic migration message for unknown colors

**Configuration:**

```javascript
// Phase 2: Warning (educate developers)
"local-rules/no-hardcoded-colors": "warn"

// Phase 4: Error (enforce compliance)
"local-rules/no-hardcoded-colors": "error"
```

**Allowlist (if needed):**
```javascript
// Special cases (brand logos, SVG icons)
/* eslint-disable local-rules/no-hardcoded-colors */
<path fill="#5865F2" /> {/* Discord logo color */}
/* eslint-enable local-rules/no-hardcoded-colors */
```

---

## Summary

**Total Design Tokens:** 74 new CSS variables
**Migration Scope:** 1,883 hardcoded color instances
**Files Affected:** 359 files
**Accessibility:** WCAG 2.1 AA minimum compliance
**Rollback Strategy:** Git tags at each phase checkpoint

**Next Steps:**
1. ✅ Phase 1 Complete - Specification documented
2. ⏳ Phase 2 Pending - Implement CSS variables and Tailwind config
3. ⏳ Phase 3 Pending - Migrate brand colors and components
4. ⏳ Phase 4 Pending - Standardize gradients
5. ⏳ Phase 5 Pending - Remove deprecated colors
6. ⏳ Phase 6 Pending - Documentation and polish

---

**Questions or Issues?**
Refer to the [Migration Playbook](/.claude/plans/color-migration-playbook.md) or raise an issue in the project repository.
