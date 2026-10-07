"""Erzeugt Symbole und Startbilder der Android-App aus desktop/icon.png.

Aufruf (einmal nach einer Änderung am Symbol): python3 scripts/android-icons.py
"""

import glob
import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")
BG = (11, 16, 38, 255)  # Hintergrundfarbe des Symbols (#0b1026)
icon = Image.open(os.path.join(ROOT, "desktop", "icon.png")).convert("RGBA")

DENSITY = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}

for name, k in DENSITY.items():
    folder = os.path.join(RES, f"mipmap-{name}")
    # klassisches Symbol (abgerundetes Quadrat) und rundes Symbol
    size = round(48 * k)
    icon.resize((size, size), Image.LANCZOS).save(os.path.join(folder, "ic_launcher.png"))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    round_icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    round_icon.paste(Image.new("RGBA", (size, size), BG), (0, 0), mask)
    round_icon.paste(icon.resize((size, size), Image.LANCZOS), (0, 0), mask)
    round_icon.save(os.path.join(folder, "ic_launcher_round.png"))
    # Vordergrund des adaptiven Symbols: 108 dp, das Bild im sicheren Bereich (72 dp)
    full = round(108 * k)
    inner = round(72 * k)
    fg = Image.new("RGBA", (full, full), (0, 0, 0, 0))
    fg.paste(icon.resize((inner, inner), Image.LANCZOS), ((full - inner) // 2,) * 2)
    fg.save(os.path.join(folder, "ic_launcher_foreground.png"))

# Startbilder: dunkler Hintergrund mit dem Symbol in der Mitte
for path in glob.glob(os.path.join(RES, "drawable*", "splash.png")):
    w, h = Image.open(path).size
    splash = Image.new("RGBA", (w, h), BG)
    s = round(min(w, h) * 0.32)
    splash.paste(icon.resize((s, s), Image.LANCZOS), ((w - s) // 2, (h - s) // 2), icon.resize((s, s), Image.LANCZOS))
    splash.convert("RGB").save(path)

with open(os.path.join(RES, "values", "ic_launcher_background.xml"), "w") as f:
    f.write(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        '    <color name="ic_launcher_background">#0B1026</color>\n</resources>\n'
    )
print("Android-Symbole und Startbilder erzeugt.")
