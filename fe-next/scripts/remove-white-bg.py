#!/usr/bin/env python3
"""
Remove white background from images using PIL.
For images generated with solid white backgrounds.
"""

from PIL import Image
import os
import sys

def remove_white_background(input_path: str, output_path: str, threshold: int = 240) -> None:
    """Remove white background from an image, making it transparent."""
    img = Image.open(input_path)

    # Convert to RGBA if needed
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    # Get pixel data
    data = img.getdata()

    new_data = []
    for item in data:
        # If pixel is close to white (all RGB values > threshold), make transparent
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            new_data.append((255, 255, 255, 0))  # Transparent
        else:
            new_data.append(item)

    img.putdata(new_data)
    img.save(output_path, 'PNG')
    print(f"  ✓ {os.path.basename(output_path)}")

def main():
    if len(sys.argv) < 3:
        print("Usage: python remove-white-bg.py input.png output.png [threshold]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    threshold = int(sys.argv[3]) if len(sys.argv) > 3 else 240

    remove_white_background(input_path, output_path, threshold)

if __name__ == "__main__":
    main()
