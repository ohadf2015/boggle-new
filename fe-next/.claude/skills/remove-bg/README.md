# Remove Background

Remove backgrounds from PNG images using AI (rembg).

## When to Use

Invoke this skill when:
- Processing mascot or character images
- Preparing transparent assets for UI
- Cleaning up raw image exports
- Batch processing image directories

## Requirements

Install rembg before first use:

```bash
pip3 install rembg[cli] pillow
```

For GPU acceleration (CUDA):
```bash
pip3 install rembg[gpu] pillow
```

## Usage

```bash
# Check if rembg is installed
python3 .claude/skills/remove-bg/scripts/remove-bg.py --check

# Single file
python3 .claude/skills/remove-bg/scripts/remove-bg.py image.png

# Multiple files
python3 .claude/skills/remove-bg/scripts/remove-bg.py image1.png image2.png image3.png

# Custom output path
python3 .claude/skills/remove-bg/scripts/remove-bg.py image.png -o clean-image.png

# Process entire directory
python3 .claude/skills/remove-bg/scripts/remove-bg.py --dir ./images

# Process directory to separate output folder
python3 .claude/skills/remove-bg/scripts/remove-bg.py --dir ./raw --output-dir ./processed

# Process recursively
python3 .claude/skills/remove-bg/scripts/remove-bg.py --dir ./images --recursive
```

## Options

| Option | Description |
|--------|-------------|
| `files` | Image file(s) to process |
| `-d, --dir <path>` | Directory containing images to process |
| `-o, --output <path>` | Output file path (single file) or directory |
| `--output-dir <path>` | Output directory for processed images |
| `-s, --suffix <str>` | Suffix for output files (default: `-nobg`) |
| `--overwrite` | Overwrite original files (use with caution!) |
| `-r, --recursive` | Process directories recursively |
| `--check` | Check if rembg is installed |

## Supported Formats

- PNG (input & output)
- JPG/JPEG (input)
- WebP (input)
- GIF (input)

Output is always PNG for transparency support.

## Examples

**Process mascot images:**
```bash
python3 .claude/skills/remove-bg/scripts/remove-bg.py public/mascot/lexi-raw.png
# Creates: public/mascot/lexi-raw-nobg.png
```

**Batch process with custom suffix:**
```bash
python3 .claude/skills/remove-bg/scripts/remove-bg.py --dir public/assets -s "-transparent"
# Creates: public/assets/*-transparent.png
```

**Overwrite originals:**
```bash
python3 .claude/skills/remove-bg/scripts/remove-bg.py image.png --overwrite
# Overwrites: image.png with transparent version
```

## Notes

- First run downloads the AI model (~170MB), subsequent runs are faster
- CPU processing: ~3-5 seconds per image
- GPU processing: ~0.5 seconds per image
- Already processed files (containing suffix in name) are skipped
