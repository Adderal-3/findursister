"""Build production-ready sprites from the legacy and expansion archives.

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
LEGACY_SOURCE_ZIP = PROJECT_ROOT / "逆水寒07小游戏素材-页面 1.zip"
EXPANSION_SOURCE_ZIP = PROJECT_ROOT / "download (11).zip"
OUTPUT_DIR = PROJECT_ROOT / "public" / "items" / "ancient"
GEOMETRY_TS = PROJECT_ROOT / "src" / "game" / "itemGeometry.ts"

CANVAS_SIZE = 256
CONTENT_SIZE = 224

# Representative Figma layer id -> stable semantic filename. Repeated layer
# exports are intentionally omitted; category membership lives in items.ts.
ASSETS: dict[int, str] = {
    593: "camel",
    594: "chili_pepper",
    595: "golden_pipa",
    596: "grapes",
    597: "mooncake",
    598: "horse",
    599: "bird_ocarina",
    600: "peach",
    601: "sedan_chair",
    602: "konghou",
    603: "golden_ewer",
    604: "cat",
    605: "red_sky_lantern",
    606: "white_porcelain_vase",
    608: "lychee",
    609: "painted_jar",
    610: "black_pitcher",
    611: "campfire",
    612: "bronze_gong",
    614: "fish_hook",
    615: "torch",
    616: "arrow",
    617: "needle",
    618: "flying_fish",
    619: "candied_hawthorn",
    620: "lotus_ewer",
    621: "spike_trap",
    622: "osmanthus_cake",
    623: "deer",
    625: "beast_fang",
    626: "waist_drum",
    627: "jade_hairpin",
    628: "black_bottle",
    629: "nine_tailed_fox",
    630: "ornate_dagger",
    631: "firefly",
    632: "shuriken",
    633: "oil_lamp",
    634: "red_dates",
    635: "inscribed_music_stand",
    638: "dandelion",
    639: "vinegar_jar",
    640: "lucky_raccoon",
    641: "rattle_drum",
    642: "wooden_pipa",
    643: "swallow",
    644: "painted_vase",
    645: "phoenix",
    646: "dragonfly",
    648: "fire_wheels",
    649: "chrysanthemum",
    650: "tangyuan",
    651: "hulusi",
    652: "inscribed_papers",
    653: "icicle",
    654: "golden_bowl",
    655: "ancient_book",
    660: "watermelon",
    661: "guqin",
    662: "orange_sky_lantern",
    663: "penguin",
    664: "incense_burner",
    665: "cotton",
    667: "eggplant",
    668: "crossed_swords",
    669: "hand_drum",
    670: "floral_hairpin",
    672: "patterned_vase",
    673: "jewelry_box",
    676: "medicine_bottle",
    677: "carriage",
    678: "butterfly",
    682: "sword",
    683: "clay_jar",
    684: "candle",
    685: "treasure_ship",
    686: "lidded_bowl",
    687: "dog",
    688: "rabbit",
    690: "blue_book",
    691: "zongzi",
    692: "kite",
    693: "partitioned_cauldron",
    694: "peony",
    695: "cabinet",
    697: "feather",
    698: "paper_crane",
}

# Expansion source number -> stable semantic filename. The archive contains
# 213 exports; only these 34 numbered files plus two special named files are
# new semantic objects. Alternate sizes and near-duplicates stay excluded.
EXPANSION_ASSETS: dict[int, str] = {
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
    896: "silver_armor",
    897: "red_tunic",
    898: "tasseled_shawl",
    899: "phoenix_crown",
    902: "embroidered_trousers",
    903: "jade_earrings",
    904: "fox_mask",
    905: "gauze_veil",
    906: "bamboo_hat",
    909: "wooden_arch_bridge",
    910: "covered_bridge",
    911: "floating_dock",
    912: "lotus_boardwalk",
    913: "stone_water_bridge",
    914: "stone_slab_bridge",
    915: "rope_bridge",
    916: "red_arch_bridge",
}

# The zip filename encoding is inconsistent across extractors, so the two
# non-numbered files are selected by their stable CRC values.
EXPANSION_SPECIAL_ASSETS: dict[int, tuple[str, str]] = {
    3919082161: ("jeweled_belt", "05385bce59553c2ece4b8a.png"),
    1289849019: ("plain_stone_arch_bridge", "图片-2.png"),
}


def source_id(filename: str) -> int | None:
    match = re.search(r"\s(\d+)-", filename)
    return int(match.group(1)) if match else None


def expansion_source_id(filename: str) -> int | None:
    match = re.search(r"\s(\d+)\.png$", filename)
    return int(match.group(1)) if match else None


def build_sprite(image: Image.Image, *, crop_top: int = 0) -> Image.Image:
    rgba = image.convert("RGBA")
    if crop_top:
        rgba = rgba.crop((0, crop_top, rgba.width, rgba.height))
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
    for source_zip in (LEGACY_SOURCE_ZIP, EXPANSION_SOURCE_ZIP):
        if not source_zip.exists():
            raise FileNotFoundError(f"missing source archive: {source_zip}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest: list[dict[str, object]] = []

    with (
        zipfile.ZipFile(LEGACY_SOURCE_ZIP) as legacy_archive,
        zipfile.ZipFile(EXPANSION_SOURCE_ZIP) as expansion_archive,
    ):
        legacy_entries = {
            item_id: info
            for info in legacy_archive.infolist()
            if (item_id := source_id(info.filename)) is not None
        }
        expansion_entries = {
            item_id: info
            for info in expansion_archive.infolist()
            if (item_id := expansion_source_id(info.filename)) is not None
        }
        special_entries = {info.CRC: info for info in expansion_archive.infolist()}

        missing_legacy = sorted(set(ASSETS) - set(legacy_entries))
        missing_expansion = sorted(set(EXPANSION_ASSETS) - set(expansion_entries))
        missing_special = sorted(set(EXPANSION_SPECIAL_ASSETS) - set(special_entries))
        if missing_legacy or missing_expansion or missing_special:
            raise ValueError(
                "source archives are missing entries: "
                f"legacy={missing_legacy}, expansion={missing_expansion}, special={missing_special}"
            )

        selected: list[tuple[zipfile.ZipFile, zipfile.ZipInfo, str, int | str, int]] = []
        selected.extend(
            (legacy_archive, legacy_entries[layer_id], item_id, layer_id, 0)
            for layer_id, item_id in ASSETS.items()
        )
        selected.extend(
            (expansion_archive, expansion_entries[layer_id], item_id, layer_id, 0)
            for layer_id, item_id in EXPANSION_ASSETS.items()
        )
        selected.extend(
            (
                expansion_archive,
                special_entries[crc],
                item_id,
                source_name,
                40 if item_id == "jeweled_belt" else 0,
            )
            for crc, (item_id, source_name) in EXPANSION_SPECIAL_ASSETS.items()
        )

        for archive, info, item_id, source_ref, crop_top in selected:
            with Image.open(io.BytesIO(archive.read(info))) as image:
                sprite = build_sprite(image, crop_top=crop_top)
                output = OUTPUT_DIR / f"{item_id}.webp"
                sprite.save(output, "WEBP", quality=90, method=4)
                visible_bounds = sprite.getchannel("A").getbbox()
                if visible_bounds is None:
                    raise ValueError(f"sprite has no visible bounds: {item_id}")
                left, top, right, bottom = visible_bounds
            manifest.append(
                {
                    "id": item_id,
                    "sourceLayer": source_ref,
                    "file": f"/items/ancient/{item_id}.webp",
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
