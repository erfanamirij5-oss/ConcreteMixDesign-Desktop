from pathlib import Path

from PIL import Image


SOURCE_ICON = Path("build/tolou.ico")
OUTPUT_ICON = Path("build/tolou.generated.ico")
ICON_SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def main() -> None:
    if not SOURCE_ICON.is_file():
        raise SystemExit(f"Source Tolou icon is missing: {SOURCE_ICON}")

    with Image.open(SOURCE_ICON) as source:
        rgba = source.convert("RGBA")
        if rgba.width < 256 or rgba.height < 256:
            raise SystemExit("Tolou source icon must contain at least a 256x256 image.")

        # Electron Builder's Windows resource editor is strict about ICO directory
        # entries. Re-encode every requested size as a classic BMP-backed ICO
        # entry instead of relying on the source container's encoding.
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
