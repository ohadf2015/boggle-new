# Vertical ad delivery — specs, safe zones, hook rules

Verified August 2026. Re-check before a campaign; Meta changes safe zones.

## Canvas

| Field | Value |
|---|---|
| Resolution | 1080 × 1920 (min width 720) |
| Aspect | 9:16 |
| Frame rate | 30 fps for ads (24–30 acceptable) |
| Format | MP4 (H.264) or MOV |
| Bitrate | 5–8 Mbps |
| Max file | 250 MB |
| Max duration | 60s (ads) / 90s (organic) |
| Target duration | **15–30s** |

Export at native 1080×1920. Exceeding 1080px width triggers Instagram recompression.

## Safe zones — Meta unified 9:16 spec (March 2026)

```
┌─────────────────────────┐  ← 0%
│ ▓▓▓ UI — TOP 14% ▓▓▓▓▓▓ │
├─────────────────────────┤  ← 14%
│                         │
│      SAFE — center      │
│   all text, branding,   │
│      CTA go here        │
│                         │
├─────────────────────────┤  ← ~65–80%
│ ▓▓ UI — BOTTOM 20–35% ▓ │
└─────────────────────────┘  ← 100%
     ▓ side margins 6% each ▓
```

- **Top 14%** — covered by platform UI
- **Bottom 20–35%** — covered by caption, handle, CTA button, audio strip
- **Sides 6%** — covered
- **Center 80%** — the only reliable region

Budget the bottom at the pessimistic **35%** — the CTA button placement varies by placement type,
and text clipped under a real CTA is worse than text placed slightly high.

## Hook rules

| Metric | Value |
|---|---|
| Viewers surviving the first 3s | 15–20% |
| Of those, watch ≥10s | 65% |
| Viral lift from a hook or jump cut in first 3s | +72% |
| Strong-hook Reels vs weak on downstream metrics | 3–5× |
| Sound-on creative vs silent | +35% |

Consequences for the board:

- Frame 1 must already be **moving**. A static opening frame is a dropped impression.
- The hook must read **sound-off** — on-screen text or unmistakable visual action.
- Retention beats duration: 30s at 80% watch-through outperforms 10s at 40%.

## Structure that performs

```
0–3s    Hook — native-feeling, motion, jump cut
3–10s   Problem / agitation
10–20s  Demo or proof — the real product appears here
20–25s  CTA, specific and verbal
```

## CTA placement

Place the install prompt at the **peak engagement moment**, not after it. Ad data shows a CTA
alongside a victory/payoff moment converts materially better than an end-card CTA
(+41% in the cited vertical-ad study).

For game ads specifically, playable and gameplay-forward creative dominates pure narrative on
install metrics — which is why a narrative trailer must still show **real UI**. Board at least one
`CAPTURE` shot at or just before the payoff.

## AI multi-shot continuity

Models carry **no memory between clips**. Every clip is independent.

- Lock a **keyframe still per shot**, then image-to-video from it.
- Chain: end frame of shot N → start image of shot N+1.
- Keep clips **3–5s**. Identity drift scales with clip length.
- Prefer **incremental** camera and pose changes over dramatic ones.
- Re-state the full character description every single prompt.
- Two characters in one frame still produces identity blending — prefer one hero character per shot.
- Reference images beat LoRA training below roughly five clips of the same character.

## On-screen text

- Sans display face, heavy weight, high contrast, solid black outline (matches brand).
- One idea per card. Two lines maximum.
- Hold a card at least 1.2s at 30fps to be readable.
- Text is baked into the render only when the model handles lettering reliably; otherwise composite
  it in post during ffmpeg assembly. Verify — AI lettering is the most common failure mode.
- RTL locales: never bake English text into the plate if a Hebrew cut is planned.
