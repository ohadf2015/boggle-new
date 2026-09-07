import sys, os
from collections import deque
from PIL import Image, ImageFilter

def cutout(src, dst, tol=46, size=256):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    px = im.load()
    seeds = [(0,0),(w-1,0),(0,h-1),(w-1,h-1)]
    # background reference colors = the four corners
    refs = [px[s] for s in seeds]
    def isbg(c):
        return any(abs(c[0]-r[0])+abs(c[1]-r[1])+abs(c[2]-r[2]) <= tol*3 for r in refs)
    alpha = Image.new('L', (w,h), 255)
    ap = alpha.load()
    seen = bytearray(w*h)
    q = deque()
    for x,y in seeds:
        if not seen[y*w+x]:
            seen[y*w+x]=1; q.append((x,y))
    while q:
        x,y = q.popleft()
        if not isbg(px[x,y]):
            continue
        ap[x,y]=0
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx,ny=x+dx,y+dy
            if 0<=nx<w and 0<=ny<h and not seen[ny*w+nx]:
                seen[ny*w+nx]=1; q.append((nx,ny))
    # soften the 1px jpeg fringe
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.7))
    ap = alpha.load()
    for y in range(h):
        for x in range(w):
            v = ap[x,y]
            ap[x,y] = 0 if v < 90 else (255 if v > 200 else v)
    out = im.convert('RGBA')
    out.putalpha(alpha)
    # tight crop to visible pixels, then pad square
    bbox = alpha.point(lambda v: 255 if v > 8 else 0).getbbox()
    out = out.crop(bbox)
    side = max(out.size)
    pad = int(side*0.04)
    canvas = Image.new('RGBA', (side+pad*2, side+pad*2), (0,0,0,0))
    canvas.paste(out, ((canvas.size[0]-out.size[0])//2, (canvas.size[1]-out.size[1])//2))
    canvas = canvas.resize((size,size), Image.LANCZOS)
    canvas.save(dst, 'WEBP', quality=92, method=6, lossless=False)
    return canvas

if __name__ == '__main__':
    for name in sys.argv[1:]:
        src = f'/Users/ohadfisher/git/boggle-new/output/{name}.jpg'
        dst = f'/Users/ohadfisher/git/boggle-new/.claude/worktrees/streak-heat/fe-next/public/mascot/{name}-nobg.webp'
        cutout(src, dst)
        print(name, os.path.getsize(dst), 'bytes')
