"""Build production-ready sprites from the latest Figma export archive.

The source archive contains large transparent canvases and repeated exports for
objects that belong to more than one category. This script keeps one semantic
file per visible object, trims transparent margins, centres it on a 256px
square canvas, and writes a compact WebP asset.
"""

from __future__ import annotations

import io
import json
import re
import zipfile
from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ZIP = PROJECT_ROOT / "逆水寒07小游戏素材-0724.zip"
OUTPUT_DIR = PROJECT_ROOT / "src" / "assets" / "items" / "ancient"
GEOMETRY_TS = PROJECT_ROOT / "src" / "game" / "itemGeometry.ts"

CANVAS_SIZE = 256
CONTENT_SIZE = 224

# Representative Figma layer id -> stable semantic filename. The 0724 export
# contains 212 numbered PNGs but only 137 unique pictures. Repeated category
# exports, category headings, and 14 additional export variants are intentionally
# omitted; category membership lives in items.ts.
ASSETS: dict[int, str] = {
    703: "camel",
    704: "chili_pepper",
    705: "golden_pipa",
    706: "grapes",
    707: "mooncake",
    708: "horse",
    710: "peach",
    711: "sedan_chair",
    712: "konghou",
    713: "golden_ewer",
    714: "cat",
    715: "red_sky_lantern",
    716: "white_porcelain_vase",
    718: "lychee",
    719: "painted_jar",
    720: "black_pitcher",
    721: "campfire",
    722: "bronze_gong",
    724: "fish_hook",
    725: "torch",
    726: "arrow",
    727: "needle",
    728: "flying_fish",
    729: "candied_hawthorn",
    730: "lotus_ewer",
    731: "spike_trap",
    732: "osmanthus_cake",
    733: "deer",
    735: "beast_fang",
    736: "waist_drum",
    737: "jade_hairpin",
    738: "black_bottle",
    739: "nine_tailed_fox",
    740: "ornate_dagger",
    741: "firefly",
    742: "shuriken",
    743: "oil_lamp",
    744: "red_dates",
    745: "inscribed_music_stand",
    746: "watermelon",
    748: "dandelion",
    749: "vinegar_jar",
    750: "lucky_raccoon",
    751: "rattle_drum",
    752: "wooden_pipa",
    753: "swallow",
    754: "painted_vase",
    755: "phoenix",
    756: "dragonfly",
    758: "fire_wheels",
    759: "chrysanthemum",
    760: "tangyuan",
    761: "hulusi",
    762: "inscribed_papers",
    763: "icicle",
    764: "golden_bowl",
    765: "ancient_book",
    771: "guqin",
    772: "orange_sky_lantern",
    773: "penguin",
    774: "incense_burner",
    775: "cotton",
    776: "bird_ocarina",
    777: "eggplant",
    778: "crossed_swords",
    779: "hand_drum",
    780: "floral_hairpin",
    782: "patterned_vase",
    783: "jewelry_box",
    786: "medicine_bottle",
    787: "carriage",
    788: "butterfly",
    792: "sword",
    793: "clay_jar",
    794: "candle",
    795: "treasure_ship",
    796: "lidded_bowl",
    797: "dog",
    798: "rabbit",
    800: "blue_book",
    801: "zongzi",
    802: "kite",
    803: "partitioned_cauldron",
    804: "peony",
    805: "cabinet",
    807: "feather",
    808: "paper_crane",
    845: "apple",
    846: "banana",
    847: "orange",
    848: "strawberry",
    849: "mango",
    850: "pear",
    851: "pineapple",
    852: "kiwi",
    853: "lemon",
    854: "melon",
    855: "dragon_fruit",
    877: "coriander",
    878: "scallion",
    879: "bitter_melon",
    880: "broccoli",
    881: "edamame",
    882: "celery",
    895: "jeweled_belt",
    896: "silver_armor",
    897: "red_tunic",
    898: "tasseled_shawl",
    899: "phoenix_crown",
    902: "embroidered_trousers",
    903: "jade_earrings",
    904: "fox_mask",
    905: "gauze_veil",
    906: "bamboo_hat",
    908: "plain_stone_arch_bridge",
    909: "wooden_arch_bridge",
    910: "covered_bridge",
    911: "floating_dock",
    912: "lotus_boardwalk",
    913: "stone_water_bridge",
    914: "stone_slab_bridge",
    915: "rope_bridge",
    916: "red_arch_bridge",
}


def source_id(filename: str) -> int | None:
    match = re.search(r"\s(\d+)-1x\.png\.png$", filename)
    return int(match.group(1)) if match else None


def build_sprite(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    bounds = rgba.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("sprite has no visible pixels")
    sprite = rgba.crop(bounds)
    sprite.thumbnail((CONTENT_SIZE, CONTENT_SIZE), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(
        sprite,
        ((CANVAS_SIZE - sprite.width) // 2, (CANVAS_SIZE - sprite.height) // 2),
    )
    return canvas


def main() -> None:
    if not SOURCE_ZIP.exists():
        raise FileNotFoundError(f"missing source archive: {SOURCE_ZIP}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest: list[dict[str, object]] = []

    with zipfile.ZipFile(SOURCE_ZIP) as archive:
        entries = {
            item_id: info
            for info in archive.infolist()
            if (item_id := source_id(info.filename)) is not None
        }
        missing = sorted(set(ASSETS) - set(entries))
        if missing:
            raise ValueError(f"source archive is missing layer entries: {missing}")

        for layer_id, item_id in ASSETS.items():
            info = entries[layer_id]
            with Image.open(io.BytesIO(archive.read(info))) as image:
                sprite = build_sprite(image)
                output = OUTPUT_DIR / f"{item_id}.webp"
                sprite.save(output, "WEBP", quality=90, method=4)
                visible_bounds = sprite.getchannel("A").getbbox()
                if visible_bounds is None:
                    raise ValueError(f"sprite has no visible bounds: {item_id}")
                left, top, right, bottom = visible_bounds
            manifest.append(
                {
                    "id": item_id,
                    "sourceLayer": layer_id,
                    "file": f"items/ancient/{item_id}.webp",
                    "bytes": output.stat().st_size,
                    "visibleWidth": round((right - left) / CANVAS_SIZE, 4),
                    "visibleHeight": round((bottom - top) / CANVAS_SIZE, 4),
                }
            )

    (OUTPUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    geometry_lines = [
        "// Generated by scripts/process_materials.py. Do not edit by hand.",
        "export interface ItemGeometry { width: number; height: number }",
        "",
        "export const ITEM_GEOMETRY: Record<string, ItemGeometry> = {",
    ]
    geometry_lines.extend(
        f"  {entry['id']!r}: {{ width: {entry['visibleWidth']}, height: {entry['visibleHeight']} }},"
        for entry in manifest
    )
    geometry_lines.extend(["};", ""])
    GEOMETRY_TS.write_text("\n".join(geometry_lines), encoding="utf-8")
    total_bytes = sum(int(entry["bytes"]) for entry in manifest)
    print(f"built {len(manifest)} sprites ({total_bytes / 1024 / 1024:.2f} MiB)")
    print(OUTPUT_DIR)


if __name__ == "__main__":
    main()
