"""Generate Lumi app icon, adaptive icon layers, splash and favicon.

Uses the theme tokens `accent` (#568BFF) on `background` (#050B14).
Run: python3 scripts/generate-icons.py  (needs Pillow)
"""

from pathlib import Path

from PIL import Image, ImageDraw

BACKGROUND = (0x05, 0x0B, 0x14, 255)
ACCENT = (0x56, 0x8B, 0xFF, 255)
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)
SCALE = 4  # supersampling for smooth edges
OUT = Path(__file__).resolve().parent.parent / "assets"


def mark(size: int, bg, fg, ring_outer: float, ring_width: float, dot: float) -> Image.Image:
    """Lens ring with a light dot in the centre. Sizes are fractions of `size`."""
    s = size * SCALE
    img = Image.new("RGBA", (s, s), bg)
    d = ImageDraw.Draw(img)
    c = s / 2
    ro = ring_outer * s
    ri = ro - ring_width * s
    d.ellipse([c - ro, c - ro, c + ro, c + ro], fill=fg)
    d.ellipse([c - ri, c - ri, c + ri, c + ri], fill=bg)
    rd = dot * s
    d.ellipse([c - rd, c - rd, c + rd, c + rd], fill=fg)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    # iOS / store icon: opaque, no transparency allowed.
    mark(1024, BACKGROUND, ACCENT, 0.32, 0.07, 0.12).convert("RGB").save(OUT / "icon.png")
    # Android adaptive icon: keep the mark inside the 66% safe zone.
    mark(1024, CLEAR, ACCENT, 0.27, 0.06, 0.10).save(OUT / "android-icon-foreground.png")
    Image.new("RGBA", (1024, 1024), BACKGROUND).save(OUT / "android-icon-background.png")
    mark(1024, CLEAR, WHITE, 0.27, 0.06, 0.10).save(OUT / "android-icon-monochrome.png")
    # Splash: mark on transparent, splash background colour is set in app.json.
    mark(1024, CLEAR, ACCENT, 0.30, 0.065, 0.11).save(OUT / "splash-icon.png")
    mark(48, BACKGROUND, ACCENT, 0.40, 0.10, 0.15).save(OUT / "favicon.png")


if __name__ == "__main__":
    main()
