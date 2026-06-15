#!/usr/bin/env python3
"""LexiClash STREET-PLACEMENT sticker ("real->virtual blink").

Portrait "pole-slap" tower: a small accent KICKER that calls back the physical
surface it's stuck on (stop sign, bin, bench, mirror, meter, door), a punch
HEADLINE, the reacting mascot, and a guaranteed-scannable QR. Decode-verified
from the final PNG. Reuses brand helpers from build_sticker.
"""
import sys, argparse
from PIL import Image, ImageDraw, ImageFont
import cv2, numpy as np
from build_sticker import (NAVY, CREAM, WHITE, BLACK, ACCENTS, DPI, FONT_BOLD,
                           FONT_SEMI, URL, rrect, hard_shadow_rrect, fit_font,
                           make_qr)

BLEED = int(0.125 * DPI)
W = int(2.4 * DPI) + 2 * BLEED   # ~795
H = int(3.7 * DPI) + 2 * BLEED   # ~1185


def wrap(font, text, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if font.getbbox(t)[2] - font.getbbox(t)[0] <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def build(mascot, kicker, headline, accent_name, out, flip=False):
    accent = ACCENTS[accent_name]
    cv = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(cv)
    rrect(d, (0, 0, W - 1, H - 1), 66, fill=WHITE)
    rrect(d, (24, 24, W - 25, H - 25), 52, fill=NAVY, outline=BLACK, width=6)
    safe = BLEED + 26
    cw = W - 2 * safe

    # --- KICKER pill (surface callback) ---
    kf, _ = fit_font(FONT_BOLD, kicker, cw - 60, start=34, min_size=20)
    kw = kf.getbbox(kicker)[2] - kf.getbbox(kicker)[0]
    kx, ky = W // 2 - kw // 2, safe + 6
    kbox = (kx - 22, ky - 12, kx + kw + 22, ky + kf.size + 12)
    hard_shadow_rrect(cv, kbox, 18, accent, off=(6, 6), ow=4)
    lum = 0.299*accent[0]+0.587*accent[1]+0.114*accent[2]
    d.text((kx, ky), kicker, font=kf, fill=BLACK if lum > 140 else WHITE)

    # --- mascot (reacts toward headline) ---
    m = Image.open(mascot).convert("RGBA")
    if flip:
        m = m.transpose(Image.FLIP_LEFT_RIGHT)
    MAXW, MAXH = cw, 430
    s = min(MAXW / m.width, MAXH / m.height)
    mw, mh = int(m.width * s), int(m.height * s)
    m = m.resize((mw, mh), Image.LANCZOS)
    my = kbox[3] + 18
    cv.alpha_composite(m, ((W - mw) // 2, my))

    # --- headline ---
    headline = headline.replace("\\n", "\n")
    hf, _ = fit_font(FONT_BOLD, max(headline.split("\n"), key=len), cw - 20, start=78, min_size=34)
    lines = []
    for seg in headline.split("\n"):
        lines += wrap(hf, seg, cw - 20)
    lh = int(hf.size * 1.04)
    hy = my + mh + 26
    for ln in lines:
        lw = hf.getbbox(ln)[2] - hf.getbbox(ln)[0]
        # accent-underscore the line via colored text on alternating? keep white, hard shadow
        d.text((W // 2 - lw // 2 + 3, hy + 3), ln, font=hf, fill=BLACK)
        d.text((W // 2 - lw // 2, hy), ln, font=hf, fill=WHITE)
        hy += lh

    # --- QR + CTA (bottom) ---
    qpx = 250
    qy = H - safe - qpx
    qx = safe + 6
    pad = 15
    pbox = (qx - pad, qy - pad, qx + qpx + pad, qy + qpx + pad)
    hard_shadow_rrect(cv, pbox, 20, CREAM, off=(6, 6), ow=5)
    cv.alpha_composite(make_qr(qpx), (qx, qy))
    tx = qx + qpx + pad + 26
    sf, _ = fit_font(FONT_BOLD, "SCAN", W - tx - safe, start=66)
    d.text((tx + 4, qy + 22 + 4), "SCAN", font=sf, fill=BLACK)
    d.text((tx, qy + 22), "SCAN", font=sf, fill=accent)
    d.text((tx + 4, qy + 22 + sf.size + 4), "ME", font=sf, fill=BLACK)
    d.text((tx, qy + 22 + sf.size), "ME", font=sf, fill=accent)
    uf, _ = fit_font(FONT_SEMI, "lexiclash.live", W - tx - safe, start=38)
    d.text((tx, qy + qpx - uf.size - 2), "lexiclash.live", font=uf, fill=CREAM)

    cv.save(out, dpi=(DPI, DPI))
    rgb = cv2.cvtColor(np.array(cv.convert("RGB")), cv2.COLOR_RGB2BGR)
    data, _, _ = cv2.QRCodeDetector().detectAndDecode(rgb)
    ok = data == URL
    print(f"{'OK ' if ok else 'FAIL'} {out}  decoded={'MATCH' if ok else repr(data)}")
    return ok


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--mascot", required=True)
    ap.add_argument("--kicker", required=True)
    ap.add_argument("--headline", required=True)
    ap.add_argument("--accent", default="pink", choices=list(ACCENTS))
    ap.add_argument("--flip", action="store_true")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    sys.exit(0 if build(a.mascot, a.kicker, a.headline, a.accent, a.out, a.flip) else 1)
