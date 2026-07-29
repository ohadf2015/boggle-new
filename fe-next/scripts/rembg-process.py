#!/usr/bin/env python3
"""
Process images with rembg for background removal.
Avoids CLI issues by using rembg programmatically.
"""

import sys
from pathlib import Path
from rembg import remove, new_session
from PIL import Image
import io

def process_image(input_path: str, output_path: str, session) -> bool:
    """Remove background from an image."""
    try:
        with open(input_path, 'rb') as f:
            input_data = f.read()

        output_data = remove(
            input_data,
            session=session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
        )

        # Ensure output directory exists
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'wb') as f:
            f.write(output_data)

        print(f"  ✓ {Path(output_path).name}")
        return True
    except Exception as e:
        print(f"  ✗ {Path(input_path).name}: {e}", file=sys.stderr)
        return False

def main():
    if len(sys.argv) < 3:
        print("Usage: python rembg-process.py input.png output.png")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    print("Loading rembg model...")
    session = new_session('u2net')  # Use u2net for faster processing
    print("Model loaded.")

    process_image(input_path, output_path, session)

if __name__ == "__main__":
    main()
