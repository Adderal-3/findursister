"""将青绿色 UI 切片映射为暖砂岩色，并完整保留原始透明度与像素尺寸。"""

from __future__ import annotations

import colorsys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
UI_DIR = ROOT / "src" / "assets" / "ui" / "qingya"
ASSETS = {
    "round-button.png": "round-button-warm-v1.png",
    "level-plaque.png": "level-plaque-warm-v1.png",
    "mission-frame.png": "mission-frame-warm-v1.png",
}


def warm_pixel(pixel: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    red, green, blue, alpha = pixel
    if alpha == 0:
        return pixel

    hue, lightness, saturation = colorsys.rgb_to_hls(
        red / 255,
        green / 255,
        blue / 255,
    )
    degrees = hue * 360

    # 只替换青、绿、蓝绿色。米白、金线和原有暖色保持不动。
    if 70 <= degrees <= 205 and saturation >= 0.045:
        if lightness < 0.48:
            hue = 24 / 360
            saturation = max(0.50, min(0.70, saturation * 1.12))
            lightness = max(0.18, min(0.38, lightness * 0.88))
        else:
            hue = 31 / 360
            saturation = max(0.24, min(0.48, saturation * 0.90 + 0.08))
            lightness = min(0.93, lightness + 0.045)
        red_f, green_f, blue_f = colorsys.hls_to_rgb(hue, lightness, saturation)
        return (
            round(red_f * 255),
            round(green_f * 255),
            round(blue_f * 255),
            alpha,
        )

    return pixel


def main() -> None:
    for source_name, output_name in ASSETS.items():
        source = UI_DIR / source_name
        output = UI_DIR / output_name
        image = Image.open(source).convert("RGBA")
        image.putdata([warm_pixel(pixel) for pixel in image.get_flattened_data()])
        image.save(output, optimize=True)
        print(f"{output.name}: {image.width}x{image.height}")


if __name__ == "__main__":
    main()
