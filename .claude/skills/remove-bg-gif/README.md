# Remove Background from GIF - Skill

**Quick Reference Card**

---

## Command

```bash
/remove-bg-gif [options] <input-gif>
```

---

## Quick Start

**1. Install dependencies:**
```bash
pip3 install imageio rembg pillow
```

**2. Process single GIF:**
```bash
/remove-bg-gif public/mascot/my-mascot.gif
```

**3. Batch process directory:**
```bash
/remove-bg-gif --batch public/mascot/
```

---

## What It Does

Removes backgrounds from **animated GIFs** frame-by-frame while preserving:
- ✅ Animation timing
- ✅ Loop count
- ✅ Transparency
- ✅ Frame order

---

## Common Use Cases

| Task | Command | Output |
|------|---------|--------|
| Process single GIF | `/remove-bg-gif input.gif` | `input-nobg.gif` |
| Batch process | `/remove-bg-gif --batch folder/` | All GIFs processed |
| Custom output | `/remove-bg-gif in.gif out.gif` | `out.gif` |
| With optimization | `/remove-bg-gif --optimize in.gif` | Smaller file size |

---

## Typical Workflow

```
1. Place GIF in public/mascot/
2. Run: /remove-bg-gif public/mascot/my-mascot.gif
3. Wait ~10 minutes (frame-by-frame processing)
4. Output: public/mascot/my-mascot-nobg.gif
5. Validate transparency and animation
6. Integrate into mascot system (see SKILL.md)
```

---

## Performance Expectations

| Metric | Target | Acceptable |
|--------|--------|------------|
| File size | <300KB | <500KB |
| Processing time | 5-10 min | 5-15 min |
| Frame count | 30-60 | 30-120 |
| Quality | Perfect edges | Minor halos OK |

---

## Integration with LexiClash

After processing, update these files:

1. `components/ui/Mascot.tsx` - Add GIF variant mapping
2. `components/ui/InteractiveMascot.tsx` - Use GIF paths
3. `components/ui/MASCOT_GUIDE.md` - Document new variant

**Example:**
```typescript
// Mascot.tsx
const GIF_VARIANTS = new Set(['happy', 'gaming', 'thinking', 'oops']);

export function getMascotImagePath(variant: MascotVariant): string {
  if (GIF_VARIANTS.has(variant)) {
    return `/mascot/${variant}-nobg.gif`;
  }
  return MASCOT_IMAGES[variant];
}
```

---

## Troubleshooting

**Problem:** GIF output is huge (>2MB)
**Solution:** Run optimization: `gifsicle -O3 --lossy=80 input.gif -o output.gif`

**Problem:** Processing takes >30 minutes
**Solution:** Normal for 100+ frame GIFs. Run in background or overnight.

**Problem:** White halo around mascot edges
**Solution:** Limitation of `rembg` model. Touch up manually in GIMP/Photoshop.

---

## Links

- **Full Documentation:** [SKILL.md](./SKILL.md)
- **Implementation Plan:** `.claude/agents/plans/gif-mascot-background-removal-integration.md`
- **Related Script:** `scripts/remove_gif_background.py`

---

## Version

**Version:** 1.0.0
**Created:** 2026-01-19
**Status:** Active
