from __future__ import annotations

import base64
import io
from pathlib import Path

from PIL import Image, ImageFile


SOURCE_ARTWORK_B64 = Path("build/tolou-source.jpg.b64")
FALLBACK_ICON = Path("build/tolou.ico")
OUTPUT_ICON = Path("build/tolou.generated.ico")
ICON_SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def _load_image_bytes(raw: bytes, label: str) -> Image.Image:
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


def _validate_png_backed_entries(data: bytes) -> None:
    count = int.from_bytes(data[4:6], "little")
    if count != len(ICON_SIZES):
        raise SystemExit(
            f"Generated Windows icon has {count} entries; expected {len(ICON_SIZES)}."
        )

    for index in range(count):
        entry = 6 + index * 16
        size = int.from_bytes(data[entry + 8:entry + 12], "little")
        offset = int.from_bytes(data[entry + 12:entry + 16], "little")
        payload = data[offset:offset + size]
        if not payload.startswith(PNG_SIGNATURE):
            raise SystemExit(
                f"Generated Windows icon entry {index + 1} is not PNG-backed; "
                "BMP-backed ICO entries can render with broken masks on Windows."
            )


def main() -> None:
    rgba = load_source()

    # PNG-backed ICO entries preserve alpha/mask semantics reliably for Windows
    # shell shortcuts, taskbar icons, title-bar icons and Electron resources.
    rgba.save(
        OUTPUT_ICON,
        format="ICO",
        sizes=ICON_SIZES,
    )

    data = OUTPUT_ICON.read_bytes()
    if len(data) < 10_000 or data[:4] != b"\x00\x00\x01\x00":
        raise SystemExit("Generated Windows icon failed basic ICO validation.")

    _validate_png_backed_entries(data)
    count = int.from_bytes(data[4:6], "little")

    print(
        f"Generated PNG-backed Tolou icon: {OUTPUT_ICON} "
        f"({len(data)} bytes, {count} sizes)"
    )


if __name__ == "__main__":
    main()
