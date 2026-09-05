from __future__ import annotations

import base64
import hashlib
import io
from pathlib import Path

from PIL import Image, ImageFile


SOURCE_ARTWORK_B64 = Path("build/tolou-canonical.png.b64")
LEGACY_SOURCE_ARTWORK_B64 = Path("build/tolou-source.jpg.b64")
FALLBACK_ICON = Path("build/tolou.ico")
OUTPUT_PNG = Path("build/tolou-canonical.png")
OUTPUT_ICON = Path("build/tolou.generated.ico")
ICON_SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
CANONICAL_PNG_SHA256 = "86fb0e54312f88105e16c0f80597cc9cdabcfbab2111e870cc0d588ff7e38534"


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


def _decode_source(path: Path) -> bytes:
    encoded = path.read_text(encoding="ascii").strip()
    return base64.b64decode(encoded, validate=True)


def load_source() -> tuple[Image.Image, bytes, str]:
    source_error: Exception | None = None

    if SOURCE_ARTWORK_B64.is_file():
        try:
            raw = _decode_source(SOURCE_ARTWORK_B64)
            digest = hashlib.sha256(raw).hexdigest()
            if digest != CANONICAL_PNG_SHA256:
                raise ValueError(
                    f"canonical Tolou PNG digest mismatch: {digest}; expected {CANONICAL_PNG_SHA256}"
                )
            if not raw.startswith(PNG_SIGNATURE):
                raise ValueError("canonical Tolou artwork is not PNG data")
            return _load_image_bytes(raw, str(SOURCE_ARTWORK_B64)), raw, "canonical PNG"
        except Exception as exc:
            source_error = exc

    # Legacy sources remain recovery-only. Production builds should always use
    # the canonical PNG above so the customer app and License Manager share the
    # exact approved Tolou artwork.
    if LEGACY_SOURCE_ARTWORK_B64.is_file():
        try:
            raw = _decode_source(LEGACY_SOURCE_ARTWORK_B64)
            return _load_image_bytes(raw, str(LEGACY_SOURCE_ARTWORK_B64)), raw, "legacy artwork fallback"
        except Exception as exc:
            source_error = exc if source_error is None else source_error

    if FALLBACK_ICON.is_file():
        try:
            raw = FALLBACK_ICON.read_bytes()
            return _load_image_bytes(raw, str(FALLBACK_ICON)), raw, "legacy ICO fallback"
        except Exception as fallback_exc:
            detail = f"Primary source error: {source_error}; fallback error: {fallback_exc}"
            raise SystemExit(f"Tolou icon sources are invalid. {detail}") from fallback_exc

    raise SystemExit(
        f"Tolou canonical artwork is missing or invalid: {SOURCE_ARTWORK_B64}. "
        f"Last source error: {source_error}"
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
    rgba, raw_source, source_label = load_source()

    # Materialize the exact approved PNG for BrowserWindow/taskbar branding and
    # package it as a runtime resource. For a canonical source, preserve bytes
    # exactly instead of re-encoding the artwork.
    if source_label == "canonical PNG":
        OUTPUT_PNG.write_bytes(raw_source)
    else:
        rgba.save(OUTPUT_PNG, format="PNG")

    # PNG-backed ICO entries preserve alpha semantics across Electron resources
    # and Windows shell surfaces. Real Windows visual acceptance remains the
    # release criterion; this validation only protects the binary structure.
    rgba.save(OUTPUT_ICON, format="ICO", sizes=ICON_SIZES)

    data = OUTPUT_ICON.read_bytes()
    if len(data) < 10_000 or data[:4] != b"\x00\x00\x01\x00":
        raise SystemExit("Generated Windows icon failed basic ICO validation.")

    _validate_png_backed_entries(data)
    count = int.from_bytes(data[4:6], "little")

    print(
        f"Prepared Tolou branding from {source_label}: {OUTPUT_PNG}, {OUTPUT_ICON} "
        f"({len(data)} ICO bytes, {count} sizes)"
    )


if __name__ == "__main__":
    main()
