# Remove Background from GIF - Skill

## Purpose
Remove solid color backgrounds from animated GIF files while preserving inner details (eyes, outlines). Optimized for cartoon/illustrated mascots with solid backgrounds.

## When to Use
- Removing black/white/solid color backgrounds from animated GIFs
- Processing mascot animations with solid backgrounds
- Converting GIFs to transparent backgrounds for web use
- Batch processing multiple GIF files

## Key Features
- ✅ **Smart flood fill** - Only removes outer background, preserves inner pixels (eyes, outlines)
- ✅ **No trails** - Uses disposal=2 to prevent animation trails
- ✅ **Binary transparency** - Fully transparent or fully opaque (GIF format requirement)
- ✅ **Batch processing** - Process multiple GIFs at once
- ✅ **Configurable tolerance** - Adjust color matching sensitivity

## Script Location
`scripts/remove_gif_bg_smart.py`

## Usage

### Single File
```bash
# Remove black background (default)
python3 scripts/remove_gif_bg_smart.py input.gif

# Custom output path
python3 scripts/remove_gif_bg_smart.py input.gif output.gif

# Custom tolerance (0-255, default: 40)
python3 scripts/remove_gif_bg_smart.py input.gif --tolerance 50

# Remove white background
python3 scripts/remove_gif_bg_smart.py input.gif --color 255 255 255
```

### Batch Processing
```bash
# Process all GIFs in directory
python3 scripts/remove_gif_bg_smart.py --batch public/mascot/

# With custom settings
python3 scripts/remove_gif_bg_smart.py --batch public/mascot/ --tolerance 50
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `input` | path | required | Input GIF file or directory |
| `output` | path | `{input}-nobg.gif` | Output file path |
| `--batch` | flag | false | Batch process directory |
| `--color R G B` | int int int | `0 0 0` | Target color to remove (RGB) |
| `--tolerance` | int | `40` | Color matching tolerance (0-255) |

## How It Works

1. **Flood Fill from Edges**
   - Starts from all 4 edges (top, bottom, left, right)
   - Finds all pixels connected to edges matching target color
   - Only removes these "outer" pixels

2. **Preserve Inner Details**
   - Black pixels NOT connected to edges are preserved
   - Keeps eyes, outlines, shadows inside the subject

3. **Binary Transparency**
   - Pixels are either fully transparent (alpha=0) or fully opaque (alpha=255)
   - No gradient alpha to prevent GIF trails

4. **Disposal Method**
   - Sets disposal=2 (clear frame before next)
   - Prevents animation trail artifacts

## Common Use Cases

### Mascot GIF Processing
```bash
# Process game mascot animations
python3 scripts/remove_gif_bg_smart.py public/mascot/main.gif
python3 scripts/remove_gif_bg_smart.py public/mascot/play.gif
python3 scripts/remove_gif_bg_smart.py public/mascot/study.gif
python3 scripts/remove_gif_bg_smart.py public/mascot/oops.gif

# Or batch process all at once
python3 scripts/remove_gif_bg_smart.py --batch public/mascot/
```

### Adjusting Tolerance
- **Too low (< 30)**: Leaves black edges/artifacts
- **Optimal (40-50)**: Removes background, preserves details
- **Too high (> 60)**: May remove dark colors inside subject

### Different Background Colors
```bash
# White background
python3 scripts/remove_gif_bg_smart.py input.gif --color 255 255 255

# Green screen
python3 scripts/remove_gif_bg_smart.py input.gif --color 0 255 0

# Custom color
python3 scripts/remove_gif_bg_smart.py input.gif --color 30 30 30 --tolerance 20
```

## Troubleshooting

### Issue: Animation shows trails
**Solution**: Script uses disposal=2 by default. If still seeing trails, check if browser/viewer supports GIF disposal methods.

### Issue: Inner black pixels removed (eyes, outlines)
**Solution**: Reduce tolerance or ensure inner black areas are NOT connected to edges.

### Issue: Background not fully removed
**Solution**: Increase tolerance (try 50-60) to match more near-black pixels.

### Issue: Edges look rough/jagged
**Solution**: This is expected with binary transparency. For smoother edges, consider using PNG format instead of GIF.

## Technical Details

### Algorithm
1. Convert frame to RGBA
2. Flood fill from edges to find outer background pixels
3. Make outer pixels fully transparent (0, 0, 0, 0)
4. Make all other pixels fully opaque (r, g, b, 255)
5. Reconstruct GIF with disposal=2

### Dependencies
- Python 3.x
- imageio >= 2.0
- Pillow >= 9.0
- numpy

### File Size
- Typical reduction: 30-50% smaller
- Binary transparency reduces color palette complexity
- Example: 1.56MB → 0.91MB

## Integration with Mascot System

The processed GIFs integrate automatically with the mascot system:

```typescript
// GIF variants are detected automatically
import { getMascotImagePath, isGifVariant } from '@/components/ui/Mascot';

// Returns: /mascot/main-nobg.gif
const path = getMascotImagePath('happy');

// Usage in components
<Image
  src={getMascotImagePath('happy')}
  unoptimized={isGifVariant('happy')}  // Required for GIF animation
  alt="Happy mascot"
/>
```

### GIF Mapping
- `happy` → `main-nobg.gif` (idle/happy state)
- `gaming` → `play-nobg.gif` (gaming/excited)
- `thinking` → `study-nobg.gif` (thinking/focused)
- `oops` → `oops-nobg.gif` (errors/mistakes)

## Best Practices

1. ✅ **Always test single frame first** before batch processing
2. ✅ **Keep original files** (script auto-creates backups)
3. ✅ **Verify in browser** after processing
4. ✅ **Use tolerance 40-50** for most cartoon GIFs with black backgrounds
5. ✅ **Batch process** for consistent results across multiple files
6. ❌ **Don't use** for photos or complex backgrounds (use AI tools instead)
7. ❌ **Don't expect** smooth gradient edges (GIF limitation)

## Limitations

- Only works with **solid color backgrounds**
- Requires background to be **connected to edges**
- **Binary transparency only** (GIF format limitation)
- **Edges are sharp** (no anti-aliasing due to GIF format)
- **Not suitable** for complex/gradient backgrounds

## Alternative Approaches

If this script doesn't work for your use case:

1. **AI-based removal** - For complex backgrounds (photos, gradients)
   - Online tools: ezgif.com, CapCut
   - Libraries: rembg, backgroundremover (didn't work for cartoons)

2. **Manual editing** - For precise control
   - Use online tools like ezgif.com
   - Frame-by-frame editing in image editors

3. **PNG format** - If smooth edges needed
   - Convert GIF to PNG sequence
   - Remove backgrounds with alpha transparency
   - Use PNG sprites instead of GIF

## Future Improvements

Potential enhancements:
- [ ] Edge anti-aliasing detection (if source has anti-aliasing)
- [ ] Multiple color target removal
- [ ] Preview mode (show which pixels will be removed)
- [ ] Automatic tolerance detection
- [ ] WebP output option (better compression + alpha)

## Version History

- **v3** (2026-01-20) - Smart flood fill algorithm, preserves inner black pixels, disposal=2 for no trails
- **v2** (2026-01-20) - Edge smoothing and feathering (caused trails - deprecated)
- **v1** (2026-01-19) - Simple chromakey removal (removed inner black - deprecated)

## Created By
Claude Code - 2026-01-20

## License
MIT
