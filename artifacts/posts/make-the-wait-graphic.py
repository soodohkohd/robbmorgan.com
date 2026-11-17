"""Render the 'year in waiting' LinkedIn graphic. Usage: make_wait_graphic.py <out.png>"""
import sys
from PIL import Image, ImageDraw, ImageFont

S = 2  # supersample
W = 1200 * S
BG, INK, SOFT, MUTED = "#f8efd8", "#1a1410", "#4a3d33", "#7a6a58"
BAR, RULE, EYEBROW = "#a37a40", "#d9caa4", "#8a6534"

SUPP = "/System/Library/Fonts/Supplemental/"
def serif(px, bold=True):
    return ImageFont.truetype(SUPP + ("Georgia Bold.ttf" if bold else "Georgia.ttf"), px * S)
def sans(px, bold=False):
    return ImageFont.truetype(SUPP + ("Arial Bold.ttf" if bold else "Arial.ttf"), px * S)

img = Image.new("RGB", (W, W), BG)
d = ImageDraw.Draw(img)
M = 90  # margin, in 1200-space

def text(x, y, s, font, fill=INK, anchor="la", tracking=0):
    if not tracking:
        d.text((x * S, y * S), s, font=font, fill=fill, anchor=anchor)
        return
    cx = x * S
    for ch in s:
        d.text((cx, y * S), ch, font=font, fill=fill, anchor=anchor)
        cx += d.textlength(ch, font=font) + tracking * S

def width(s, font):
    return d.textlength(s, font=font) / S

# Header
text(M, 92, "YOUR YEAR IN WAITING", sans(27, True), EYEBROW, tracking=5)
hero = serif(196)
text(M - 6, 140, "172", hero)
text(M + width("172", hero) + 22, 248, "hours", serif(84, False), SOFT)
text(M, 378, "More than seven full days. Every year. Just waiting.", serif(37, False), SOFT)

# Bars (hours per person, per year)
rows = [("Standing in line", 110), ("Stuck in traffic", 49), ("On hold", 13)]
MAXW, BH = 850, 46
y = 488
for label, v in rows:
    text(M, y, label, sans(29, True))
    by = y + 46
    bw = MAXW * v / 110
    d.rounded_rectangle([M * S, by * S, (M + bw) * S, (by + BH) * S], radius=6 * S,
                        fill=BAR, corners=(False, True, True, False))
    text(M + bw + 16, by + BH / 2, f"{v} hrs", serif(34), INK, anchor="lm")
    y += 132

# Divider + per-occasion facts
d.line([M * S, 900 * S, (1200 - M) * S, 900 * S], fill=RULE, width=2 * S)
text(M, 924, "AND THE SMALL ONES ADD UP", sans(20, True), EYEBROW, tracking=3)
facts = [("10%", "of every drive,", "sitting at red lights"),
         ("5:35", "per trip through", "the drive-thru"),
         ("23 min", "per visit, waiting", "at the doctor's office")]
colw = (1200 - 2 * M) / 3
for i, (num, l1, l2) in enumerate(facts):
    x = M + i * colw
    text(x, 962, num, serif(58))
    text(x, 1036, l1, sans(23), SOFT)
    text(x, 1065, l2, sans(23), SOFT)

# Footer
text(M, 1128, "Per person, per year, US. Lines: NYT 2012 estimate. Traffic: INRIX 2025. Hold: TalkTo 2013. "
     "Red lights: INRIX 2022.", sans(15), MUTED)
text(M, 1150, "Drive-thru: QSR / Intouch Insight 2025. Doctor: PatientPoint 2024.", sans(15), MUTED)
text(1200 - M, 1150, "robbmorgan.com", sans(15, True), MUTED, anchor="ra")

img.resize((1200, 1200), Image.LANCZOS).save(sys.argv[1])
