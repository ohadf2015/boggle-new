#!/usr/bin/env python3
"""Remove background from animated GIF frame-by-frame using rembg."""

import sys
import io
from pathlib import Path
import imageio.v3 as iio
from PIL import Image
import rembg

def main():
    input_path = Path(sys.argv[1])
    if len(sys.argv) > 2:
        output_path = Path(sys.argv[2])
    else:
        output_path = input_path.with_stem(input_path.stem + "-nobg")

    print(f"Processing: {input_path}")
    print(f"Output: {output_path}")

    # Read all frames
    frames = iio.imread(input_path, plugin='pillow', mode='RGBA')
    meta = iio.immeta(input_path, plugin='pillow')
    duration = meta.get('duration', 100)
    print(f"Frames: {len(frames)}, Duration: {duration}ms")

    processed = []
    for i, frame in enumerate(frames):
        print(f"  Frame {i+1}/{len(frames)}")
        img = Image.fromarray(frame)
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        out_bytes = rembg.remove(buf.getvalue())
        out_img = Image.open(io.BytesIO(out_bytes)).convert('RGBA')
        import numpy as np
        processed.append(np.array(out_img))

    import numpy as np
    processed_arr = np.stack(processed)
    iio.imwrite(output_path, processed_arr, plugin='pillow', duration=duration, loop=0)

    size_kb = output_path.stat().st_size / 1024
    print(f"Done! Output: {output_path} ({size_kb:.0f}KB)")

if __name__ == '__main__':
    main()
