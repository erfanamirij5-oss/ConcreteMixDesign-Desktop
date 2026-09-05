from __future__ import annotations

import base64
import io
from pathlib import Path

from PIL import Image


SOURCE_ARTWORK_B64 = Path("build/tolou-source.jpg.b64")
OUTPUT_ICON = Path("build/tolou.generated.ico")
ICON_SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def load_source() -> Image.Image:
    if not SOURCE_ARTWORK_B64.is_file():
        raise SystemExit(f"Tolou source artwork is missing: {SOURCE_ARTWORK_B64}")

    try:
        encoded = SOURCE_ARTWORK_B64.read_text(encoding="ascii").strip()
        raw = base64.b64decode(encoded, validate=True)
        source = Image.open(io.BytesIO(raw))
        source.load()
    except Exception as exc:  # fail closed with a controlled build error
        raise SystemExit(f"Tolou source artwork is invalid: {exc}") from exc

    rgba = source.convert("RGBA")
    if rgba.width < 256 or rgba.height < 256:
        raise SystemExit("Tolou source artwork must be at least 256x256 pixels.")
    return rgba


def main() -> None:
    rgba = load_source()

    # Re-encode each Windows icon size from the deterministic source artwork.
    # BMP-backed ICO entries are deliberately used because Electron Builder's
    # Windows resource editor is stricter than generic image viewers.
    rgba.save(
        OUTPUT_ICON,
        format="ICO",
        sizes=ICON_SIZES,
        bitmap_format="bmp",
    )

    data = OUTPUT_ICON.read_bytes()
    if len(data) < 10_000 or data[:4] != b"\x00\x00\x01\x00":
        raise SystemExit("Generated Windows icon failed basic ICO validation.")

    count = int.from_bytes(data[4:6], "little")
    if count != len(ICON_SIZES):
        raise SystemExit(
            f"Generated Windows icon has {count} entries; expected {len(ICON_SIZES)}."
        )

    print(
        f"Generated resource-compatible Tolou icon: {OUTPUT_ICON} "
        f"({len(data)} bytes, {count} sizes)"
    )


if __name__ == "__main__":
    main()
