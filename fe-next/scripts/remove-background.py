#!/usr/bin/env python3
"""
Background removal script using rembg.
Usage: python scripts/remove-background.py input.png output.png
       python scripts/remove-background.py --batch input_dir/ output_dir/
"""

import argparse
import sys
from pathlib import Path
from rembg import remove, new_session

# Use birefnet-general for best quality
MODEL_NAME = 'birefnet-general'

def remove_background(input_path: Path, output_path: Path, session) -> bool:
    """Remove background from a single image."""
    try:
        with open(input_path, 'rb') as f:
            input_data = f.read()

        # Remove background with alpha matting for clean edges
        output_data = remove(
            input_data,
            session=session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
        )

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'wb') as f:
            f.write(output_data)

        print(f"✓ {input_path.name} -> {output_path.name}")
        return True
    except Exception as e:
        print(f"✗ {input_path.name}: {e}", file=sys.stderr)
        return False


def process_batch(input_dir: Path, output_dir: Path, session) -> tuple[int, int]:
    """Process all images in a directory."""
    success, failed = 0, 0
    extensions = {'.png', '.jpg', '.jpeg', '.webp'}

    for input_path in input_dir.iterdir():
        if input_path.suffix.lower() not in extensions:
            continue

        output_path = output_dir / f"{input_path.stem}_nobg.png"
        if remove_background(input_path, output_path, session):
            success += 1
        else:
            failed += 1

    return success, failed


def main():
    parser = argparse.ArgumentParser(description='Remove backgrounds from images using rembg')
    parser.add_argument('input', help='Input image or directory')
    parser.add_argument('output', help='Output image or directory')
    parser.add_argument('--batch', action='store_true', help='Process entire directory')
    parser.add_argument('--model', default=MODEL_NAME, help=f'Model to use (default: {MODEL_NAME})')

    args = parser.parse_args()

    print(f"Loading model: {args.model}...")
    session = new_session(args.model)
    print("Model loaded.")

    input_path = Path(args.input)
    output_path = Path(args.output)

    if args.batch:
        if not input_path.is_dir():
            print(f"Error: {input_path} is not a directory", file=sys.stderr)
            sys.exit(1)

        success, failed = process_batch(input_path, output_path, session)
        print(f"\nCompleted: {success} success, {failed} failed")
        sys.exit(0 if failed == 0 else 1)
    else:
        if not input_path.is_file():
            print(f"Error: {input_path} is not a file", file=sys.stderr)
            sys.exit(1)

        success = remove_background(input_path, output_path, session)
        sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
