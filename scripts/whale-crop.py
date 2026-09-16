from PIL import Image

src = Image.open('C:/Temp/ds-logo-src.png').convert('RGB')
w, h = src.size
px = src.load()

def is_bg(p):
    return p[0] > 225 and p[1] > 225 and p[2] > 225

# Whale zone: rows 100..215, scan columns left->right in upper band;
# the whale ends where a FULL-HEIGHT white gap (>=8px) appears before 'd'.
TOP, BOT = 100, 215
GAP = 10
last_ink = 0
x = 0
while x < int(w * 0.30):
    ink = any(not is_bg(px[x, y]) for y in range(TOP, BOT))
    if ink:
        last_ink = x
    else:
        # check gap run
        run = 0
        xx = x
        while xx < int(w * 0.30) and all(is_bg(px[xx, y]) for y in range(TOP, BOT)):
            run += 1
            xx += 1
        if run >= GAP:
            break
        x = xx - 1
    x += 1

print('whale right edge:', last_ink)
# vertical bbox within 0..last_ink
minx, miny, maxx, maxy = w, h, 0, 0
for y in range(h):
    for xx in range(0, last_ink + 1):
        if not is_bg(px[xx, y]):
            if xx < minx:
                minx = xx
            if xx > maxx:
                maxx = xx
            if y < miny:
                miny = y
            if y > maxy:
                maxy = y
print('bbox:', minx, miny, maxx, maxy)
pad = 16
minx = max(0, minx - pad)
miny = max(0, miny - pad)
maxx = min(maxx + pad, w - 1)
maxy = min(maxy + pad, h - 1)
crop = src.crop((minx, miny, maxx + 1, maxy + 1))
print('crop size:', crop.size)
crop.save('C:/Temp/whale-crop.png')
