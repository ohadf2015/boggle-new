# AdSense Compliance Documentation

## Overview

This document outlines how LexiClash complies with Google AdSense policies, particularly focusing on gaming site requirements.

**Last Updated:** January 26, 2026
**AdSense Account ID:** ca-pub-1896836706464880

---

## Critical AdSense Requirements for Gaming Sites

### 1. Ad Placement Restrictions

#### ✅ ALLOWED Ad Zones
- **Game Lobby**: Before gameplay starts
- **Between Rounds**: After one round ends, before next begins
- **Content Pages**: About, Contact, Legal, Rules, etc.
- **Post-Game**: After game completion, showing results
- **Main Menu**: Settings, profile pages

#### ❌ PROHIBITED Ad Zones
- **Active Gameplay**: NEVER during active game sessions
- **Game Board**: On or near the active game interface
- **While Timer Active**: During timed gameplay
- **Overlaying Game Elements**: Ads must not obstruct game controls

### 2. Required Legal Pages

All required pages are implemented and accessible:

- ✅ **About Us** (`/[locale]/about`)
  - Company information: LexiClash Ltd
  - Mission statement
  - Team information
  - Contact information

- ✅ **Privacy Policy** (`/[locale]/legal/privacy`)
  - Data collection practices
  - **Section 4: Third-Party Advertising** (AdSense disclosure)
  - Cookie usage
  - User rights

- ✅ **Terms of Service** (`/[locale]/legal/terms`)
  - User agreement
  - Conduct rules
  - Liability disclaimers

- ✅ **Contact Page** (`/[locale]/contact`)
  - Email: lexiclash.game@gmail.com
  - Instagram: @lexi.clash

### 3. app-ads.txt Configuration

File location: `/app/app-ads.txt/route.ts`

Content:
```
google.com, pub-1896836706464880, DIRECT, f08c47fec0942fa0
```

This declares Google as the authorized advertising partner for LexiClash.

### 4. AdSense Meta Tag

Configured in `/app/layout.tsx`:

```typescript
metadata: {
  other: {
    'google-adsense-account': 'ca-pub-1896836706464880'
  }
}
```

---

## Implementation Guide

### Using AdPlaceholder Component

The `AdPlaceholder` component (`/components/ads/AdPlaceholder.tsx`) identifies safe zones for ads:

```tsx
import { AdPlaceholder } from '@/components/ads';

// In game lobby
<AdPlaceholder zone="lobby" />

// Between game rounds
<AdPlaceholder zone="between-rounds" />

// On content pages
<AdPlaceholder zone="content-page" />
```

### Ad Zone Types

| Zone Type | Description | AdSense Compliant |
|-----------|-------------|-------------------|
| `lobby` | Game lobby/waiting room | ✅ Yes |
| `between-rounds` | Between game rounds | ✅ Yes |
| `content-page` | Static pages | ✅ Yes |
| `post-game` | After game ends | ✅ Yes |
| `menu` | Settings/profile | ✅ Yes |
| ~~`active-game`~~ | During gameplay | ❌ **NEVER** |

---

## Content Quality Standards

### E-E-A-T Principles

LexiClash demonstrates expertise and trustworthiness through:

1. **Experience**: Real-time multiplayer word game with proven player base
2. **Expertise**: Developed by experienced software engineers
3. **Authoritativeness**: Clear company information and contact methods
4. **Trustworthiness**:
   - Transparent privacy policy
   - Secure authentication (Google OAuth, Discord)
   - Clear terms of service
   - Responsive customer support

### Content Guidelines

- ✅ Original gameplay mechanics
- ✅ Educational value (vocabulary building)
- ✅ Multi-language support (5 languages)
- ✅ Clear user interface
- ✅ No misleading content
- ✅ Family-friendly gameplay

---

## Multi-Language Support

All legal content is available in 5 languages:

- 🇮🇱 Hebrew (עברית) - RTL support
- 🇺🇸 English
- 🇸🇪 Swedish (Svenska)
- 🇯🇵 Japanese (日本語)
- 🇪🇸 Spanish (Español)

Translation keys are in `/translations/` directory.

---

## AdSense Policy Compliance Checklist

### Pre-Launch

- [x] About Us page created with company information
- [x] Privacy Policy includes AdSense disclosure section
- [x] Terms of Service published
- [x] Contact page with valid email/social media
- [x] app-ads.txt configured with publisher ID
- [x] AdSense meta tag added to site
- [x] AdPlaceholder component created for safe zones
- [ ] AdSense ad code integrated (pending approval)
- [ ] Ads tested in safe zones only
- [ ] No ads on active gameplay verified

### Post-Launch Monitoring

- [ ] Regular policy compliance review
- [ ] Ad placement audits (quarterly)
- [ ] User feedback monitoring
- [ ] Privacy policy updates (as needed)
- [ ] AdSense performance reports

---

## Common Violations to Avoid

### Gaming-Specific Violations

1. **Ads on Active Gameplay** ❌
   - Never place ads during active game sessions
   - Wait until round ends or game is paused

2. **Obstructing Game Controls** ❌
   - Ads must not cover buttons, timers, or game board
   - Maintain clear separation between ads and gameplay

3. **Misleading Ad Placement** ❌
   - Don't disguise ads as game elements
   - Clearly label advertisements

4. **Excessive Ad Density** ❌
   - Don't overwhelm users with ads
   - Follow "content-first" principle

### General Violations

1. **Invalid Traffic** ❌
   - No encouraging clicks ("Click here!")
   - No automated clicks

2. **Prohibited Content** ❌
   - No adult content
   - No violent content
   - No copyrighted material

3. **Privacy Violations** ❌
   - Must have privacy policy
   - Must disclose cookie usage
   - Must allow opt-out

---

## Testing & Verification

### Before AdSense Submission

1. Verify all legal pages are accessible
2. Check Privacy Policy includes advertising section
3. Confirm app-ads.txt is served correctly: `https://lexiclash.live/app-ads.txt`
4. Test AdPlaceholder components render in safe zones only
5. Verify no ad zones appear during active gameplay
6. Check all pages load correctly in all 5 languages

### After AdSense Approval

1. Integrate AdSense ad code into AdPlaceholder components
2. Test ads appear only in approved zones
3. Monitor for policy warnings in AdSense dashboard
4. Collect user feedback on ad placement
5. Review ad performance metrics

---

## Contact Information

For AdSense-related inquiries:

**Company:** LexiClash Ltd
**Email:** lexiclash.game@gmail.com
**Instagram:** @lexi.clash
**Website:** https://www.lexiclash.live

---

## References

- [AdSense Gaming Content Policies](https://support.google.com/adsense/answer/9335567)
- [Ad Placement Policies](https://support.google.com/adsense/answer/1346295)
- [app-ads.txt Specification](https://iabtechlab.com/app-ads-txt/)
- [AdSense Program Policies](https://support.google.com/adsense/answer/48182)
- [E-E-A-T Guidelines](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)

---

**Document Version:** 1.0
**Maintained By:** LexiClash Development Team
**Review Frequency:** Quarterly or upon policy updates
