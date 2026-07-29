# Remove Background from GIF

Smart GIF background removal that preserves inner details and prevents animation trails.

## Quick Start

```bash
# Single file
python3 scripts/remove_gif_bg_smart.py input.gif

# Batch process directory
python3 scripts/remove_gif_bg_smart.py --batch public/mascot/

# Custom tolerance
python3 scripts/remove_gif_bg_smart.py input.gif --tolerance 50
```

## Features

✅ Only removes outer background (flood fill from edges)
✅ Preserves inner black pixels (eyes, outlines)
✅ No animation trails (disposal=2)
✅ Binary transparency (GIF compatible)
✅ Batch processing support

## Documentation

See [SKILL.md](./SKILL.md) for complete documentation.

## Script Location

- Main script: `scripts/remove_gif_bg_smart.py`
- Skill copy: `.claude/skills/remove-bg-gif/remove_gif_bg_smart.py`
