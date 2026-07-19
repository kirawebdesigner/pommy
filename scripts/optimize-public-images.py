"""Generate deterministic responsive image variants for the static public site."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
MENU_SOURCE = ROOT / "assets" / "images" / "menu"
OUTPUT = ROOT / "assets" / "images" / "optimized"


def resize(source: Path, width: int, destination: Path, quality: int = 84) -> None:
    with Image.open(source) as image:
        if image.width <= width:
            resized = image.copy()
        else:
            height = round(image.height * width / image.width)
            resized = image.resize((width, height), Image.Resampling.LANCZOS)
        resized.save(destination, "WEBP", quality=quality, method=6)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for generated in OUTPUT.glob("*.webp"):
        generated.unlink()

    for source in sorted(MENU_SOURCE.glob("*.jpg")):
        with Image.open(source) as image:
            source_width = image.width
        for width in sorted({480, 800, min(1280, source_width)}):
            if width <= source_width:
                resize(source, width, OUTPUT / f"{source.stem}-{width}.webp")

    logo = ROOT / "assets" / "images" / "pommy-logo.png"
    for width in (128, 256):
        resize(logo, width, OUTPUT / f"pommy-logo-{width}.webp", quality=90)
    with Image.open(logo) as image:
        height = round(image.height * 192 / image.width)
        image.resize((192, height), Image.Resampling.LANCZOS).save(
            OUTPUT / "pommy-logo-192.png", "PNG", optimize=True
        )


if __name__ == "__main__":
    main()
