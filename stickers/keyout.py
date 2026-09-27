"""Background-connected white removal via corner flood-fill (preserves white mascot body)."""
import sys, cv2, numpy as np
from PIL import Image

def keyout(src, dst, tol=22):
    img = cv2.imread(src, cv2.IMREAD_COLOR)
    h, w = img.shape[:2]
    mask = np.zeros((h + 2, w + 2), np.uint8)
    lo = (tol, tol, tol); hi = (tol, tol, tol)
    flags = 4 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY | cv2.FLOODFILL_FIXED_RANGE
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        cv2.floodFill(img.copy(), mask, seed, 0, lo, hi, flags)
    bg = mask[1:-1, 1:-1]                       # 255 where background
    # close pinholes, then feather the alpha edge 1px for clean anti-alias
    bg = cv2.morphologyEx(bg, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    alpha = 255 - bg                            # 0 bg, 255 subject
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0)
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    out = np.dstack([rgb, alpha]).astype(np.uint8)
    # autocrop to subject bbox + small pad
    ys, xs = np.where(alpha > 10)
    pad = 12
    y0, y1 = max(ys.min()-pad,0), min(ys.max()+pad,h)
    x0, x1 = max(xs.min()-pad,0), min(xs.max()+pad,w)
    Image.fromarray(out[y0:y1, x0:x1]).save(dst)
    frac = (alpha > 10).mean()
    print(f"{dst}  subject_frac={frac:.2f}  crop={x1-x0}x{y1-y0}")

for name in ["smug","battle","cheeky","sly"]:
    keyout(f"assets/pose-{name}.png", f"assets/cut-{name}.png")
