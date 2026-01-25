#!/usr/bin/env python3
"""
Boss Image Processor for LexiClash Adventure Mode

This script:
1. Removes backgrounds from boss character images using rembg
2. Compresses images to WebP format (<200KB target)
3. Outputs optimized images ready for web use

Requirements:
    pip install rembg pillow

Usage:
    python process-boss-images.py
"""

import os
import sys
from pathlib import Path

try:
    from rembg import remove
    from PIL import Image
    import io
except ImportError:
    print("Missing dependencies. Please install:")
    print("  pip install rembg pillow")
    sys.exit(1)


# Configuration
INPUT_DIR = Path(__file__).parent.parent / "public/images/adventure/bosses"
OUTPUT_DIR = INPUT_DIR  # Output to same directory
TARGET_SIZE_KB = 180  # Target file size in KB (leave buffer for 200KB limit)
MAX_DIMENSION = 512  # Max width/height for boss portraits


def get_raw_images() -> list[Path]:
    """Find all raw (unprocessed) boss images."""
    return list(INPUT_DIR.glob("*-raw.png"))


def remove_background(input_path: Path) -> Image.Image:
    """Remove background from image using rembg."""
    print(f"  Removing background from {input_path.name}...")

    with open(input_path, "rb") as f:
        input_data = f.read()

    output_data = remove(input_data)
    return Image.open(io.BytesIO(output_data)).convert("RGBA")


def resize_image(img: Image.Image, max_dim: int) -> Image.Image:
    """Resize image to fit within max dimensions while maintaining aspect ratio."""
    width, height = img.size

    if width <= max_dim and height <= max_dim:
        return img

    if width > height:
        new_width = max_dim
        new_height = int(height * (max_dim / width))
    else:
        new_height = max_dim
        new_width = int(width * (max_dim / height))

    print(f"  Resizing from {width}x{height} to {new_width}x{new_height}")
    return img.resize((new_width, new_height), Image.Resampling.LANCZOS)


def compress_to_webp(img: Image.Image, output_path: Path, target_kb: int) -> int:
    """Compress image to WebP format, targeting a specific file size."""
    # Start with high quality and reduce if needed
    quality = 85
    min_quality = 50

    while quality >= min_quality:
        buffer = io.BytesIO()
        img.save(buffer, format="WEBP", quality=quality, method=6)
        size_kb = len(buffer.getvalue()) / 1024

        if size_kb <= target_kb:
            # Save to file
            with open(output_path, "wb") as f:
                f.write(buffer.getvalue())
            return int(size_kb)

        quality -= 5

    # If we can't meet target, save at minimum quality
    buffer = io.BytesIO()
    img.save(buffer, format="WEBP", quality=min_quality, method=6)
    with open(output_path, "wb") as f:
        f.write(buffer.getvalue())
    return int(len(buffer.getvalue()) / 1024)


def process_image(input_path: Path) -> tuple[str, int]:
    """Process a single boss image: remove bg, resize, compress."""
    # Generate output filename (remove -raw suffix, change to .webp)
    output_name = input_path.stem.replace("-raw", "") + ".webp"
    output_path = OUTPUT_DIR / output_name

    # Step 1: Remove background
    img = remove_background(input_path)

    # Step 2: Resize if needed
    img = resize_image(img, MAX_DIMENSION)

    # Step 3: Compress to WebP
    final_size = compress_to_webp(img, output_path, TARGET_SIZE_KB)

    return output_name, final_size


def main():
    """Main entry point."""
    print("=" * 60)
    print("LexiClash Boss Image Processor")
    print("=" * 60)
    print()

    # Find raw images
    raw_images = get_raw_images()

    if not raw_images:
        print(f"No raw images found in {INPUT_DIR}")
        print("Looking for files matching pattern: *-raw.png")
        sys.exit(1)

    print(f"Found {len(raw_images)} raw boss images to process:")
    for img in raw_images:
        print(f"  - {img.name}")
    print()

    # Process each image
    results = []
    for input_path in raw_images:
        print(f"Processing {input_path.name}...")
        try:
            output_name, size_kb = process_image(input_path)
            results.append((output_name, size_kb, "OK"))
            print(f"  -> {output_name} ({size_kb} KB)")
        except Exception as e:
            results.append((input_path.name, 0, f"ERROR: {e}"))
            print(f"  -> ERROR: {e}")
        print()

    # Summary
    print("=" * 60)
    print("PROCESSING COMPLETE")
    print("=" * 60)
    print()
    print(f"{'Filename':<35} {'Size':<10} {'Status':<15}")
    print("-" * 60)
    for name, size, status in results:
        size_str = f"{size} KB" if size > 0 else "N/A"
        print(f"{name:<35} {size_str:<10} {status:<15}")

    # Check for any files over target
    oversized = [r for r in results if r[1] > TARGET_SIZE_KB]
    if oversized:
        print()
        print(f"WARNING: {len(oversized)} files exceed {TARGET_SIZE_KB} KB target")

    print()
    print(f"Output directory: {OUTPUT_DIR}")
    print()
    print("Next steps:")
    print("  1. Review generated images visually")
    print("  2. Delete *-raw.png files if satisfied")
    print("  3. Commit the .webp files to git")


if __name__ == "__main__":
    main()
