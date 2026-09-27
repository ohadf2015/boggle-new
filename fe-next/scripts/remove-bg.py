#!/usr/bin/env python3
"""
Background Removal Script for UI Images
Uses rembg library to remove backgrounds from images

Usage:
    python scripts/remove-bg.py <input_image> [output_image]

Example:
    python scripts/remove-bg.py generated_images/icon.png public/images/icon-no-bg.png

Install dependencies:
    pip install rembg pillow
"""

import sys
import os
from pathlib import Path

try:
    from rembg import remove
    from PIL import Image
except ImportError:
    print("Error: Required libraries not installed.")
    print("Install with: pip install rembg pillow")
    sys.exit(1)


def remove_background(input_path: str, output_path: str = None):
    """
    Remove background from an image

    Args:
        input_path: Path to input image
        output_path: Path to save output image (optional, defaults to input_path with -no-bg suffix)
    """
    # Validate input file
    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)

    # Generate output path if not provided
    if output_path is None:
        input_file = Path(input_path)
        output_path = str(input_file.parent / f"{input_file.stem}-no-bg{input_file.suffix}")

    print(f"Processing: {input_path}")
    print(f"Output will be saved to: {output_path}")

    try:
        # Open input image
        input_image = Image.open(input_path)

        # Remove background
        print("Removing background...")
        output_image = remove(input_image)

        # Create output directory if it doesn't exist
        os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)

        # Save output
        output_image.save(output_path)
        print(f"✅ Success! Background removed and saved to: {output_path}")

        # Show file sizes
        input_size = os.path.getsize(input_path) / 1024
        output_size = os.path.getsize(output_path) / 1024
        print(f"\nFile sizes:")
        print(f"  Input:  {input_size:.2f} KB")
        print(f"  Output: {output_size:.2f} KB")

    except Exception as e:
        print(f"Error processing image: {e}")
        sys.exit(1)


def main():
    if len(sys.argv) < 2:
        print("Usage: python remove-bg.py <input_image> [output_image]")
        print("\nExample:")
        print("  python scripts/remove-bg.py generated_images/icon.png")
        print("  python scripts/remove-bg.py icon.png public/images/icon-no-bg.png")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None

    remove_background(input_path, output_path)


if __name__ == "__main__":
    main()
