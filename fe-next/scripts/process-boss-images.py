#!/usr/bin/env python3
"""
Boss Image Processor

Removes backgrounds from boss images using rembg and optimizes them.
Run: python scripts/process-boss-images.py

Requirements:
- pip install rembg pillow
"""

import os
from pathlib import Path

try:
    from rembg import remove
    from PIL import Image
except ImportError:
    print("Error: Required packages not installed.")
    print("Run: pip install rembg pillow")
    exit(1)


# Configuration
INPUT_DIR = Path("public/images/bosses")
OUTPUT_DIR = Path("public/images/bosses")
MAX_SIZE = (800, 800)  # Max dimensions
TARGET_SIZE_KB = 200   # Target file size in KB


def process_image(input_path: Path, output_path: Path) -> dict:
    """Remove background and optimize a single image."""
    stats = {"input": input_path.name, "success": False}

    try:
        # Read and remove background
        with open(input_path, "rb") as f:
            input_data = f.read()
            output_data = remove(input_data)

        # Load as PIL image for optimization
        from io import BytesIO
        img = Image.open(BytesIO(output_data))

        # Convert to RGBA if needed
        if img.mode != "RGBA":
            img = img.convert("RGBA")

        # Resize if too large
        if img.size[0] > MAX_SIZE[0] or img.size[1] > MAX_SIZE[1]:
            img.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)

        # Save as PNG (WebP conversion done by sharp in Node.js)
        output_png = output_path.with_suffix(".png")
        img.save(output_png, "PNG", optimize=True)

        stats["output"] = output_png.name
        stats["size_kb"] = output_png.stat().st_size / 1024
        stats["success"] = True

        print(f"Processed: {input_path.name} -> {output_png.name} ({stats['size_kb']:.1f}KB)")

    except Exception as e:
        stats["error"] = str(e)
        print(f"Error processing {input_path.name}: {e}")

    return stats


def main():
    """Process all boss images."""
    print("Boss Image Processor")
    print("=" * 50)

    # Find all raw images
    raw_images = list(INPUT_DIR.glob("*-raw.png"))

    if not raw_images:
        print(f"No raw images found in {INPUT_DIR}")
        print("Expected files like: boss-ms-grammar-raw.png")
        return

    print(f"Found {len(raw_images)} images to process\n")

    results = []
    for raw_path in sorted(raw_images):
        # Output name without -raw suffix
        output_name = raw_path.name.replace("-raw", "")
        output_path = OUTPUT_DIR / output_name

        result = process_image(raw_path, output_path)
        results.append(result)

    # Summary
    print("\n" + "=" * 50)
    successful = sum(1 for r in results if r["success"])
    print(f"Processed: {successful}/{len(results)} images")

    # Check file sizes
    large_files = [r for r in results if r.get("size_kb", 0) > TARGET_SIZE_KB]
    if large_files:
        print(f"\nWarning: {len(large_files)} files exceed {TARGET_SIZE_KB}KB:")
        for f in large_files:
            print(f"  - {f['output']}: {f['size_kb']:.1f}KB")


if __name__ == "__main__":
    main()
