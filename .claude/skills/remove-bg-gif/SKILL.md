# Skill: Remove Background from GIF Files

**Command:** `/remove-bg-gif [gif-path]`

**Purpose:** Process animated GIF files to remove backgrounds frame-by-frame using Python + rembg, optimized for the LexiClash mascot system.

---

## When to Use This Skill

✅ **Use when:**
- Adding new animated mascot GIFs to the game
- Processing user-submitted GIF mascots
- Creating transparent GIF assets for any purpose
- Batch processing multiple GIF files

❌ **Don't use when:**
- Processing static PNG images (use `/remove-bg` instead)
- GIFs already have transparent backgrounds
- Working with video files (MP4, WebM)

---

## What This Skill Does

1. **Analyzes** the GIF file structure (frame count, timing, metadata)
2. **Extracts** all frames from the animated GIF
3. **Processes** each frame individually with `rembg` background removal
4. **Reconstructs** the GIF with transparent backgrounds, preserving animation timing
5. **Optimizes** the output GIF for web (file size reduction)
6. **Validates** the output (animation integrity, transparency, file size)
7. **Integrates** into LexiClash mascot system (optional)

---

## Prerequisites

**Python Dependencies:**
```bash
pip3 install imageio rembg pillow
```

**Optional (for optimization):**
```bash
brew install gifsicle  # macOS
# OR
apt-get install gifsicle  # Linux
```

---

## Usage Examples

### Example 1: Process Single GIF

```bash
/remove-bg-gif public/mascot/new-mascot.gif
```

**Result:**
- Creates `public/mascot/new-mascot-nobg.gif`
- Original backed up as `new-mascot.gif.backup`
- Console output shows frame-by-frame progress

### Example 2: Batch Process All GIFs in Directory

```bash
/remove-bg-gif --batch public/mascot/
```

**Result:**
- Processes all `.gif` files in directory
- Skips files already processed (`*-nobg.gif`)
- Creates backups for all originals
- Summary report at end

### Example 3: Process with Custom Output Path

```bash
/remove-bg-gif input.gif output-transparent.gif
```

**Result:**
- Processes `input.gif`
- Saves result to `output-transparent.gif`
- No automatic backup (manual path specified)

### Example 4: Optimize After Processing

```bash
/remove-bg-gif --optimize public/mascot/main.gif
```

**Result:**
- Removes background from `main.gif`
- Automatically runs GIF optimization (lossy compression)
- Target file size: <500KB

---

## Skill Workflow

### Phase 1: Preparation

1. **Verify dependencies:** Check Python packages installed
2. **Analyze input:** Read GIF metadata (frame count, duration, size)
3. **Create backup:** Save original as `{filename}.gif.backup`
4. **Validate input:** Ensure GIF is valid and processable

### Phase 2: Frame-by-Frame Processing

1. **Extract frames:** Use `imageio.v3.imread()` to get all frames
2. **Store metadata:** Save duration, loop count, disposal method
3. **Process each frame:**
   - Convert frame to PNG bytes
   - Apply `rembg.remove()` for background removal
   - Convert back to PIL Image
   - Append to processed frames list
4. **Progress reporting:** Print `Frame X/Y` status

### Phase 3: GIF Reconstruction

1. **Reassemble GIF:** Use `imageio.v3.imwrite()` with original timing
2. **Set loop count:** Infinite loop (`loop=0`)
3. **Preserve transparency:** Ensure alpha channel maintained
4. **Write output:** Save to `{filename}-nobg.gif`

### Phase 4: Optimization (Optional)

1. **Check file size:** If >500KB, optimize
2. **Apply compression:** Use `gifsicle -O3 --lossy=80`
3. **Validate quality:** Ensure animation still smooth
4. **Report savings:** Print file size before/after

### Phase 5: Validation

1. **Check output exists:** Verify file created successfully
2. **Validate GIF format:** Use `file` command
3. **Test animation:** Open in browser, verify plays correctly
4. **Check transparency:** Verify background removed
5. **Report results:** Print summary (frame count, file size, duration)

---

## Script Template

**Location:** `scripts/remove_gif_background.py`

**Key Functions:**

```python
def extract_gif_frames(input_path: Path) -> tuple[list, dict]:
    """Extract all frames and metadata from GIF."""
    frames = imageio.v3.imread(input_path, plugin='pillow')
    metadata = imageio.v3.immeta(input_path)
    return frames, metadata

def process_frame(frame: np.ndarray) -> Image:
    """Remove background from single frame."""
    img = Image.fromarray(frame)
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    output_bytes = rembg.remove(img_bytes.getvalue())
    return Image.open(io.BytesIO(output_bytes))

def reconstruct_gif(frames: list, metadata: dict, output_path: Path):
    """Reassemble frames into optimized GIF."""
    imageio.v3.imwrite(
        output_path,
        frames,
        duration=metadata.get('duration', 100),
        loop=0,
        optimize=True
    )

def optimize_gif(input_path: Path, output_path: Path):
    """Optimize GIF file size using gifsicle."""
    subprocess.run([
        'gifsicle',
        '-O3',
        '--lossy=80',
        str(input_path),
        '-o', str(output_path)
    ])
```

---

## Expected Results

**Before Processing:**
- `main.gif` - 1.6MB with colored background

**After Processing:**
- `main-nobg.gif` - 450KB with transparent background
- `main.gif.backup` - Original preserved
- Console output:
  ```
  Processing: main.gif
  Frame 1/120
  Frame 2/120
  ...
  Frame 120/120
  ✓ Background removed
  ✓ Optimized: 1.6MB → 450KB
  ✓ Saved: main-nobg.gif
  ```

---

## Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'rembg'"

**Solution:**
```bash
pip3 install rembg pillow imageio
```

### Issue: GIF output is very large (>2MB)

**Solution:**
```bash
# Run optimization separately
python3 scripts/optimize_processed_gifs.py public/mascot/*-nobg.gif
```

### Issue: Animation timing is off after processing

**Solution:**
- Check `metadata['duration']` is preserved
- Some GIFs have variable frame durations (array, not single value)
- Use `imageio.v3.imwrite()` with `duration` parameter as array

### Issue: Transparency has white fringe/halo

**Solution:**
- This is a limitation of `rembg` model
- Manually touch up in image editor (GIMP, Photoshop)
- Try different `rembg` model: `rembg.remove(input, model='u2net_human_seg')`

### Issue: Processing is very slow (>10 min per GIF)

**Solution:**
- Normal for high frame count GIFs (100+ frames)
- Process overnight or in background
- Consider reducing frame count (keep every other frame) if acceptable

---

## Integration with Mascot System

After processing GIFs, integrate into LexiClash:

1. **Update variant mapping** in `components/ui/Mascot.tsx`:
   ```typescript
   const GIF_VARIANTS = new Set(['happy', 'gaming', 'thinking', 'oops']);
   ```

2. **Add path helper**:
   ```typescript
   export function getMascotImagePath(variant: MascotVariant): string {
     if (GIF_VARIANTS.has(variant)) {
       const gifMap = {
         'happy': '/mascot/main-nobg.gif',
         'gaming': '/mascot/play-nobg.gif',
         'thinking': '/mascot/study-nobg.gif',
         'oops': '/mascot/oops-nobg.gif',
       };
       return gifMap[variant];
     }
     return MASCOT_IMAGES[variant];
   }
   ```

3. **Update components** to use `getMascotImagePath()` instead of direct `MASCOT_IMAGES` lookup

4. **Add `unoptimized` prop** for Next.js Image components rendering GIFs

---

## Performance Guidelines

**Target Metrics:**
- **File size:** <500KB per GIF (after optimization)
- **Frame count:** 30-120 frames ideal
- **Frame rate:** 10-30 FPS
- **Processing time:** 5-15 minutes per GIF acceptable
- **Animation smoothness:** No visible stuttering

**Optimization Tips:**
- Use lossy compression (80% quality is good balance)
- Reduce color palette if possible (256 colors max)
- Remove duplicate frames (if any exist)
- Dithering can reduce file size for gradients

---

## Quality Checklist

After processing, verify:

- [ ] Background is fully transparent (no white/colored remnants)
- [ ] Animation loops smoothly (no frame drops)
- [ ] File size is acceptable (<500KB)
- [ ] Transparency edges are clean (no halos/fringes)
- [ ] Original animation timing preserved
- [ ] GIF plays in all major browsers (Chrome, Firefox, Safari)
- [ ] Works on dark backgrounds (LexiClash theme)
- [ ] Backup of original exists (`.backup` file)

---

## Skill Metadata

**Version:** 1.0.0
**Author:** LexiClash Development Team
**Created:** 2026-01-19
**Dependencies:** Python 3.8+, rembg, pillow, imageio, gifsicle (optional)
**Estimated Time:** 5-15 minutes per GIF (processing), 5 minutes (integration)
**Complexity:** Medium (frame-by-frame processing requires care)

---

## Related Skills

- `/remove-bg` - Static PNG background removal (simpler, faster)
- `/optimize-images` - General image optimization
- `/generate-mascot` - AI mascot image generation

---

## Future Enhancements

**Potential improvements:**
- Add WebP animated format support (better compression than GIF)
- Parallel frame processing (multiprocessing for speed)
- Smart frame reduction (remove duplicate frames automatically)
- Quality analysis (detect halos/fringes automatically)
- Batch processing with progress bar (tqdm library)
- Integration with CI/CD (auto-process on commit)

---

## Notes

**Important caveats:**
- `rembg` quality depends on model - human subjects work best
- Cartoon/illustrated mascots may have edge artifacts
- Manual touch-up sometimes needed for perfect results
- Processing is CPU-intensive (expect high CPU usage)
- Memory usage scales with frame count (200MB+ typical)

**Best practices:**
- Always create backups before processing
- Process one GIF at a time initially (test quality)
- Validate output before deleting original
- Keep originals in version control or separate backup
- Document any manual touch-ups for reproducibility
