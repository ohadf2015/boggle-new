#!/usr/bin/env python3
"""
Background removal script for mascot images.
Uses rembg library to automatically remove backgrounds from generated mascot images.

Usage:
    python scripts/remove_mascot_bg.py <input_image> <output_image>

    # Or process all temp images:
    python scripts/remove_mascot_bg.py --process-temp
"""

import sys
import os
from pathlib import Path

try:
    from rembg import remove
    from PIL import Image
except ImportError:
    print("Error: Required packages not installed.")
    print("Please install: pip install rembg pillow")
    sys.exit(1)


def remove_background(input_path: str, output_path: str) -> None:
    """
    Remove background from an image and save the result.

    Args:
        input_path: Path to input image
        output_path: Path to save output image
    """
    print(f"Processing: {input_path}")

    # Read input image
    with open(input_path, 'rb') as input_file:
        input_data = input_file.read()

    # Remove background
    output_data = remove(input_data)

    # Save output image
    with open(output_path, 'wb') as output_file:
        output_file.write(output_data)

    print(f"✓ Saved: {output_path}")


def process_temp_images() -> None:
    """
    Process all temporary mascot images in the public/mascot directory.
    Removes backgrounds and saves final versions.
    """
    mascot_dir = Path(__file__).parent.parent / 'public' / 'mascot'

    # Find all temp images
    temp_images = list(mascot_dir.glob('*-temp.png'))

    if not temp_images:
        print("No temporary images found in public/mascot/")
        return

    print(f"Found {len(temp_images)} temporary images to process\n")

    for temp_path in temp_images:
        # Generate output path (remove -temp suffix)
        output_name = temp_path.name.replace('-temp.png', '.png')
        output_path = temp_path.parent / output_name

        try:
            remove_background(str(temp_path), str(output_path))

            # Delete temp file after successful processing
            temp_path.unlink()
            print(f"✓ Deleted temp file: {temp_path.name}\n")

        except Exception as e:
            print(f"✗ Error processing {temp_path.name}: {e}\n")
            continue

    print("Background removal complete!")


def main():
    """Main entry point."""
    if len(sys.argv) == 2 and sys.argv[1] == '--process-temp':
        process_temp_images()
    elif len(sys.argv) == 3:
        input_path = sys.argv[1]
        output_path = sys.argv[2]

        if not os.path.exists(input_path):
            print(f"Error: Input file not found: {input_path}")
            sys.exit(1)

        remove_background(input_path, output_path)
    else:
        print("Usage:")
        print("  python scripts/remove_mascot_bg.py <input_image> <output_image>")
        print("  python scripts/remove_mascot_bg.py --process-temp")
        sys.exit(1)


if __name__ == '__main__':
    main()
