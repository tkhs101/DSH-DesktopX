from PIL import Image, ImageDraw, ImageFilter

SRC = 'C:/Temp/whale-v2-src.png'  # user-supplied clean whale, white bg
PAD_RATIO = 0.06  # tight bbox + small pad: whale fills the tile
THRESH = 225


def is_bg(p):
    return p[0] > THRESH and p[1] > THRESH and p[2] > THRESH


src = Image.open(SRC).convert('RGB')
w, h = src.size
px = src.load()

minx, miny, maxx, maxy = w, h, 0, 0
for y in range(h):
    for x in range(w):
        if not is_bg(px[x, y]):
            minx = min(minx, x)
            maxx = max(maxx, x)
            miny = min(miny, y)
            maxy = max(maxy, y)

print('bbox:', minx, miny, maxx, maxy)
pad = int(max(maxx - minx, maxy - miny) * PAD_RATIO)
minx = max(0, minx - pad)
miny = max(0, miny - pad)
maxx = min(maxx + pad, w - 1)
maxy = min(maxy + pad, h - 1)
crop = src.crop((minx, miny, maxx + 1, maxy + 1))
print('crop size:', crop.size)

# square canvas, upscale 4x, hard mask at high res, smooth alpha back down
side_in = max(crop.size)
sq = Image.new('RGB', (side_in, side_in), (255, 255, 255))
sq.paste(crop, ((side_in - crop.size[0]) // 2, (side_in - crop.size[1]) // 2))
SCALE = 4
big = sq.resize((side_in * SCALE, side_in * SCALE), Image.LANCZOS)
bw, bh = big.size
pxb = big.load()
mask = bytearray(bw * bh)
i = 0
for y in range(bh):
    for x in range(bw):
        r, g, b = pxb[x, y]
        mask[i] = 0 if (r > THRESH and g > THRESH and b > THRESH) else 255
        i += 1
m = Image.frombytes('L', big.size, bytes(mask))
m = m.filter(ImageFilter.MinFilter(3))
m = m.resize((side_in, side_in), Image.LANCZOS)
sq.putalpha(m)

TILE = 1024
MARGIN = int(TILE * 0.06)
# Black whale on white rounded tile (DeepSeek brand: black mark, light ground).
tile = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
d = ImageDraw.Draw(tile)
d.rounded_rectangle([0, 0, TILE - 1, TILE - 1], radius=int(TILE * 0.225), fill=(255, 255, 255, 255))
inner = TILE - 2 * MARGIN
whale = sq.resize((inner, inner), Image.LANCZOS)
# recolor opaque pixels to near-black, keep smooth alpha
r, g, b, a = whale.split()
black = Image.new('RGBA', whale.size, (20, 20, 22, 255))
black.putalpha(a)
tile.alpha_composite(black, (MARGIN, MARGIN))
tile.save('C:/Temp/whale-icon-1024.png')
print('tile saved 1024')

# Tray at 16px: white rounded tile reads as a blob and its AA corners fringe.
# Use BLACK rounded tile + WHITE whale (inverted brand): dark tile blends into
# dark taskbars, white whale stays crisp; on light taskbars the black tile is
# a clean rounded square (same language as the 1024 icon was). Binarized alpha.
GLYPH = 64
tile_small = tile.resize((GLYPH, GLYPH), Image.LANCZOS)
tray = tile_small.resize((16, 16), Image.LANCZOS)
# rebuild: black tile + white glyph at 16px directly for crisp edges
T = 64
t16tile = Image.new('RGBA', (T, T), (0, 0, 0, 0))
dd = ImageDraw.Draw(t16tile)
dd.rounded_rectangle([0, 0, T - 1, T - 1], radius=int(T * 0.225), fill=(20, 20, 22, 255))
gw = sq.resize((int(T * 0.88), int(T * 0.88)), Image.LANCZOS)
rr, gg, bb, aa = gw.split()
ww = Image.new('RGBA', gw.size, (255, 255, 255, 255))
ww.putalpha(aa)
t16tile.alpha_composite(ww, ((T - gw.size[0]) // 2, (T - gw.size[1]) // 2))
# Tray: NO tile — bare white whale glyph on full transparency.
# Rationale: Win11 tray pads icons with its own rounded dark base; any square
# tile (light or dark) fringes against it, and 16px AA corners leak dark RGB
# through premultiplied-alpha compositing. Glyph-only has no corners to fringe.
tray = sq.resize((16, 16), Image.LANCZOS)
r, g, b, a = tray.split()
white16 = Image.new('RGBA', tray.size, (20, 20, 22, 255))
white16.putalpha(a)
# harden edges for tiny size: threshold alpha, scrub transparent RGB to white
ab = white16.split()[3].point(lambda v: 255 if v >= 110 else 0)
pxw = white16.load()
abl = ab.load()
for yy in range(16):
    for xx in range(16):
        if abl[xx, yy] == 0:
            pxw[xx, yy] = (20, 20, 22, 0)
white16.putalpha(ab)
white16.save('assets/tray.png')
print('tray.png updated (bare white glyph, no tile)')

tile.save('assets/icon.ico', sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print('icon.ico saved')
