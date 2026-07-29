#!/usr/bin/env python3
"""
Add gaussian blur to parallax layers for depth effect.
Far layers get more blur, near layers get less blur.
"""

from PIL import Image, ImageFilter
import os
import sys

# Blur configuration: layer name -> blur radius
# Higher radius = more blur (farther away)
BLUR_CONFIG = {
    # World 1 - Meadows
    "meadows-hills": 4,      # Far - heavy blur
    "meadows-grass": 1,      # Near - slight blur

    # World 2 - Springs
    "springs-waterfall": 5,  # Far - heavy blur
    "springs-mist": 2,       # Mid - medium blur
    "springs-rocks": 1,      # Near - slight blur

    # World 3 - Caverns
    "caverns-crystals-far": 5,   # Far - heavy blur
    "caverns-stalactites": 3,    # Mid - medium blur
    "caverns-crystals-near": 1,  # Near - slight blur
}

def add_blur(input_path: str, output_path: str, radius: float) -> None:
    """Apply gaussian blur-sm to an image while preserving transparency."""
    img = Image.open(input_path)

    # Convert to RGBA if needed
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    # Separate alpha channel
    r, g, b, a = img.split()

    # Apply blur to RGB channels only
    rgb = Image.merge('RGB', (r, g, b))
    rgb_blurred = rgb.filter(ImageFilter.GaussianBlur(radius=radius))

    # Recombine with original alpha
    r_b, g_b, b_b = rgb_blurred.split()
    result = Image.merge('RGBA', (r_b, g_b, b_b, a))

    result.save(output_path, 'PNG')
    print(f"  ✓ {os.path.basename(output_path)} (blur radius: {radius})")

def main():
    # Process nobg files from raw/adventure
    input_dir = os.path.expanduser("~/git/boggle-new/fe-next/raw/adventure")
    output_dir = input_dir  # Output to same directory

    os.makedirs(output_dir, exist_ok=True)

    print("Adding blur-sm depth effect to parallax layers...")
    print()

    for layer_name, blur_radius in BLUR_CONFIG.items():
        # Look for nobg version first
        input_file = None
        for suffix in ["-nobg.png", ".png"]:
            candidate = os.path.join(input_dir, f"{layer_name}{suffix}")
            if os.path.exists(candidate):
                input_file = candidate
                break

        if not input_file:
            print(f"  ✗ {layer_name} - not found!")
            continue

        # Output as the final filename (without -nobg)
        output_file = os.path.join(output_dir, f"{layer_name}-blurred.png")
        add_blur(input_file, output_file, blur_radius)

    print()
    print("Done! Blurred parallax layers saved to raw/adventure/")

if __name__ == "__main__":
    main()
