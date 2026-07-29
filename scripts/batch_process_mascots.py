#!/usr/bin/env python3
"""Batch process all 20 new mascot GIFs: rembg background removal + gifsicle optimization."""

import io
import sys
import subprocess
from pathlib import Path
from PIL import Image
import numpy as np

try:
    from rembg import remove
except ImportError:
    print("ERROR: rembg not installed. Run: pip3 install rembg")
    sys.exit(1)

# Mapping: source GIF filename fragment → target filename
MAPPING = {
    "carrying_heavy_trophy": "trophy-nobg.gif",
    "1280HatYVyg_cheering": "spectating-nobg.gif",
    "fortnite_dance": "dj-nobg.gif",
    "crying": "crying-nobg.gif",
    "gaming": "play-nobg.gif",
    "MK0bKWAls2s": "main-nobg.gif",          # happy
    "on_fire": "onfire-nobg.gif",
    "d8PIg5Syl4k": "study-nobg.gif",          # thinking
    "flexing": "flexing-nobg.gif",
    "adventure": "explorer-nobg.gif",
    "mind_blowing": "mindblown-nobg.gif",
    "seller": "shopkeeper-nobg.gif",
    "cute_creature_slips_from_a_ban": "oops-nobg.gif",
    "nwFZjwaLFXM_cheering": "encouraging-nobg.gif",
    "panicing": "panic-nobg.gif",
    "scared_and_hiding": "scared-nobg.gif",
    "bored": "bored-nobg.gif",
    "confetti": "celebration-nobg.gif",
    "weaving_hi": "waving-nobg.gif",
    "powerup": "powerup-nobg.gif",
}

SRC_DIR = Path("fe-next/public/gifs")
DST_DIR = Path("fe-next/public/mascot")


def find_source_gif(fragment: str) -> Path | None:
    """Find GIF file matching the fragment in its name."""
    for f in SRC_DIR.glob("*.gif"):
        if fragment in f.name:
            # Avoid matching the old comeback GIF for generic fragments
            if fragment == "powerup" and "c6Zotmwau94" in f.name:
                continue
            return f
    return None


def process_gif(src: Path, dst: Path) -> bool:
    """Remove background from GIF frame-by-frame."""
    print(f"  Loading {src.name}...")

    # Open GIF and extract frames
    img = Image.open(src)
    frames = []
    durations = []

    n_frames = getattr(img, 'n_frames', 1)
    print(f"  Frames: {n_frames}")

    for i in range(n_frames):
        img.seek(i)
        frame = img.convert("RGBA")

        # Get frame duration
        duration = img.info.get('duration', 100)
        durations.append(duration)

        # Convert to bytes for rembg
        buf = io.BytesIO()
        frame.save(buf, format="PNG")
        buf.seek(0)

        # Remove background
        result_bytes = remove(buf.read())
        result_frame = Image.open(io.BytesIO(result_bytes)).convert("RGBA")
        frames.append(result_frame)

        if (i + 1) % 10 == 0 or i == n_frames - 1:
            print(f"  Frame {i+1}/{n_frames}")

    # Save as GIF
    print(f"  Saving {dst.name}...")
    frames[0].save(
        dst,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        disposal=2,  # Clear frame before drawing next (important for transparency)
        optimize=False,
    )

    return True


def optimize_gif(path: Path) -> None:
    """Optimize with gifsicle."""
    tmp = path.with_suffix('.tmp.gif')
    result = subprocess.run(
        ['gifsicle', '-O3', '--lossy=80', '--resize-width', '200', str(path), '-o', str(tmp)],
        capture_output=True, text=True
    )
    if result.returncode == 0 and tmp.exists():
        tmp.replace(path)
        print(f"  Optimized: {path.stat().st_size / 1024:.0f}KB")
    else:
        if tmp.exists():
            tmp.unlink()
        print(f"  Warning: gifsicle optimization failed, keeping unoptimized")


def main():
    processed = 0
    failed = []

    for fragment, target_name in MAPPING.items():
        print(f"\n[{processed+1}/20] {target_name}")

        src = find_source_gif(fragment)
        if not src:
            print(f"  ERROR: No source GIF found for '{fragment}'")
            failed.append(target_name)
            continue

        dst = DST_DIR / target_name

        try:
            process_gif(src, dst)
            optimize_gif(dst)
            processed += 1
        except Exception as e:
            print(f"  ERROR: {e}")
            failed.append(target_name)

    print(f"\n{'='*50}")
    print(f"Processed: {processed}/20")
    if failed:
        print(f"Failed: {', '.join(failed)}")
    else:
        print("All 20 mascot GIFs processed successfully!")


if __name__ == "__main__":
    main()
