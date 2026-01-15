#!/usr/bin/env python3
"""
Batch background removal for all mascot images.
Processes all PNG files in public/mascot/ directory.
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


def remove_background(input_path: str, output_path: str) -> bool:
    """
    Remove background from an image and save the result.

    Returns:
        True if successful, False otherwise
    """
    try:
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
        return True

    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def main():
    """Process all mascot images."""
    # Get mascot directory
    script_dir = Path(__file__).parent
    mascot_dir = script_dir.parent / 'public' / 'mascot'

    if not mascot_dir.exists():
        print(f"Error: Mascot directory not found: {mascot_dir}")
        sys.exit(1)

    # Find all PNG files
    png_files = list(mascot_dir.glob('lexi-*.png'))

    if not png_files:
        print("No mascot images found in public/mascot/")
        return

    print(f"Found {len(png_files)} mascot images to process\n")
    print("=" * 60)

    success_count = 0
    fail_count = 0

    for png_file in sorted(png_files):
        # Create backup
        backup_path = png_file.with_suffix('.png.backup')

        # Skip if already has backup (already processed)
        if backup_path.exists():
            print(f"⊘ Skipping (backup exists): {png_file.name}")
            continue

        # Backup original
        import shutil
        shutil.copy2(png_file, backup_path)

        # Process image
        temp_output = png_file.with_suffix('.png.tmp')
        if remove_background(str(png_file), str(temp_output)):
            # Replace original with processed version
            temp_output.replace(png_file)
            success_count += 1
        else:
            # Restore from backup on failure
            backup_path.replace(png_file)
            fail_count += 1

        print()

    print("=" * 60)
    print(f"\n✅ Successfully processed: {success_count}")
    if fail_count > 0:
        print(f"❌ Failed: {fail_count}")
    print(f"\n💾 Backups saved with .backup extension")
    print("   To restore originals: rename .backup files back to .png")


if __name__ == '__main__':
    main()
