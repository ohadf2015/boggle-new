# CSP media-src Directive

## Issue

Content Security Policy (CSP) was blocking audio playback with the following error:

```
Loading media from 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
violates the following Content Security Policy directive: "default-src 'self'".
Note that 'media-src' was not explicitly set, so 'default-src' is used as a fallback.
```

## Root Cause

Howler.js (our audio library) uses a base64-encoded data URI to test audio playback capabilities on iOS Safari. This is part of their audio unlocking mechanism for mobile devices.

Without an explicit `media-src` directive, CSP falls back to `default-src 'self'`, which:
- ✅ Allows self-hosted audio files (`/music/*.mp3`)
- ❌ Blocks data URI audio (`data:audio/wav;base64,...`)

## Solution

Add explicit `media-src 'self' data:` to CSP in `next.config.mjs`:

```javascript
// Before (blocked data URIs)
"default-src 'self'; script-src ...; img-src 'self' data: https: blob:; ..."

// After (allows data URIs for audio)
"default-src 'self'; script-src ...; img-src 'self' data: https: blob:; media-src 'self' data:; ..."
```

## What This Allows

1. **Self-hosted audio** (`'self'`): Our music tracks in `/public/music/`
2. **Data URI audio** (`data:`): Howler.js iOS unlock mechanism

## Security Implications

### Safe ✅
- Data URIs are inline content (not external resources)
- Howler.js generates its own test audio programmatically
- No external audio sources can be loaded

### Attack Surface
- Data URIs cannot be used for CSRF or XSS
- Inline audio has no network implications
- Same security as allowing data URIs for images (`img-src data:`)

## Testing

Run the CSP compatibility test:

```bash
npm run test:frontend -- __tests__/integration/howler-csp.test.ts
```

## Verification

Check CSP header in browser DevTools:
1. Open browser console
2. Navigate to any page
3. Check Network tab → Response Headers → `Content-Security-Policy`
4. Verify: `media-src 'self' data:`

## References

- [Howler.js iOS Audio Unlocking](https://github.com/goldfire/howler.js#mobile-playback)
- [CSP media-src Directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/media-src)
- [Data URIs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs)
