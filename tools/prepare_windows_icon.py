from __future__ import annotations

import base64
import io
from pathlib import Path

from PIL import Image, ImageFile


SOURCE_ARTWORK_B64 = Path("build/tolou-source.jpg.b64")
FALLBACK_ICON = Path("build/tolou.ico")
OUTPUT_ICON = Path("build/tolou.generated.ico")
ICON_SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def _load_image_bytes(raw: bytes, label: str) -> Image.Image:
    # The repository source artwork was transported through text/base64 and can
    # contain a recoverable truncated JPEG stream. Pillow is instructed to load
    # recoverable truncated images, after which the source is immediately
    # re-encoded into a fresh deterministic ICO. This does not bypass the size,
    # decode, ICO header or entry-count validation below.
    previous = ImageFile.LOAD_TRUNCATED_IMAGES
    ImageFile.LOAD_TRUNCATED_IMAGES = True
    try:
        source = Image.open(io.BytesIO(raw))
        source.load()
    except Exception as exc:
        raise ValueError(f"{label} is not a valid recoverable image: {exc}") from exc
    finally:
        ImageFile.LOAD_TRUNCATED_IMAGES = previous

    rgba = source.convert("RGBA")
    if rgba.width < 256 or rgba.height < 256:
        raise ValueError(f"{label} must be at least 256x256 pixels.")
    return rgba


def load_source() -> Image.Image:
    source_error: Exception | None = None

    if SOURCE_ARTWORK_B64.is_file():
        try:
            encoded = SOURCE_ARTWORK_B64.read_text(encoding="ascii").strip()
            raw = base64.b64decode(encoded, validate=True)
            return _load_image_bytes(raw, str(SOURCE_ARTWORK_B64))
        except Exception as exc:
            source_error = exc

    if FALLBACK_ICON.is_file():
        try:
            return _load_image_bytes(FALLBACK_ICON.read_bytes(), str(FALLBACK_ICON))
        except Exception as fallback_exc:
            detail = f"Primary source error: {source_error}; fallback error: {fallback_exc}"
            raise SystemExit(f"Tolou icon sources are invalid. {detail}") from fallback_exc

    if source_error is not None:
        raise SystemExit(
            f"Tolou source artwork is invalid and no fallback icon exists: {source_error}"
        ) from source_error

    raise SystemExit(
        f"Tolou source artwork is missing: {SOURCE_ARTWORK_B64}; "
        f"fallback icon is also missing: {FALLBACK_ICON}"
    )


def main() -> None:
    rgba = load_source()

    # Re-encode each Windows icon size from a deterministic repository source.
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
