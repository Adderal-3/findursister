"""Generate the 200-level multi-objective difficulty curve."""

from __future__ import annotations

import csv
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LEVELS = ROOT / "数值表_src" / "levels_200.csv"
LEVEL_COUNT = 200

CATEGORIES = [
    "instrument", "written", "container", "flying", "glowing",
    "sharp", "sweet_food", "plant", "vehicle", "animal",
]

TYPE_COEFFICIENT = {
    "standard": 1.0,
    "cluster": 0.95,
    "mist": 0.92,
    "night": 0.94,
    "speed": 0.65,
    "boss": 0.9,
}

EARLY_GOAL_SETS = [
    ("instrument", "fruit"),
    ("written", "animal"),
    ("container", "flying"),
    ("glowing", "vegetable"),
    ("sharp", "animal"),
    ("sweet_food", "vehicle"),
    ("plant", "ceramic"),
    ("food", "weapon"),
    ("round", "animal"),
    ("slender", "fruit"),
]

ADVANCED_GOAL_SETS = [
    ("sweet_plants", "instrument"),
    ("wooden_bridges", "fruit"),
    ("metal_wearables", "vegetable"),
    ("luminous_fliers", "container"),
    ("fruit_or_vegetable", "written"),
    ("animal_or_vehicle", "ceramic"),
    ("food_not_sweet", "glowing"),
    ("sharp_not_weapon", "plant"),
    ("bridge_not_wood", "animal"),
    ("patterned", "fruit"),
]

EXPERT_GOAL_SETS = [
    ("sweet_plants", "instrument", "animal"),
    ("wooden_bridges", "fruit", "wearable"),
    ("metal_wearables", "vegetable", "flying"),
    ("luminous_fliers", "container", "weapon"),
    ("fruit_or_vegetable", "written", "animal"),
    ("animal_or_vehicle", "ceramic", "plant"),
    ("food_not_sweet", "glowing", "vehicle"),
    ("sharp_not_weapon", "plant", "animal"),
    ("bridge_not_wood", "animal", "instrument"),
    ("patterned", "animal", "fruit"),
]

# 与任务库默认目标数保持一致，避免小候选池任务把同一目标图刷两遍。
TASK_CAPS = {
    "instrument": 8,
    "written": 6,
    "container": 8,
    "flying": 8,
    "glowing": 7,
    "sharp": 8,
    "sweet_food": 8,
    "plant": 8,
    "vehicle": 8,
    "animal": 7,
    "food": 8,
    "fruit": 7,
    "vegetable": 6,
    "wearable": 6,
    "weapon": 5,
    "wood": 7,
    "ceramic": 6,
    "metal_jewelry": 7,
    "round": 7,
    "slender": 7,
    "patterned": 7,
    "sweet_plants": 6,
    "wooden_bridges": 5,
    "metal_wearables": 5,
    "luminous_fliers": 3,
    "fruit_or_vegetable": 8,
    "animal_or_vehicle": 8,
    "food_not_sweet": 6,
    "sharp_not_weapon": 5,
    "bridge_not_wood": 3,
}


def total_target_count(level: int, level_type: str) -> int:
    """前期逐步教学，后期在 10~12 件间形成稳定高阶挑战。"""
    if level <= 3:
        return 3
    base = min(12, 4 + (level - 4) // 12)
    if level_type == "boss":
        return min(12, base + 2)
    if level_type == "speed":
        return max(4, base - 2)
    return base


def theoretical_max(count: int, time_limit: int) -> float:
    score = 0.0
    for index in range(count):
        remaining = max(0.0, time_limit - index * 0.4)
        combo = min(index + 1, 10)
        multiplier = 1 + 0.1 * (combo - 1)
        score += remaining * multiplier
    return round(score, 2)


def tasks_for_level(level: int, category: str) -> tuple[str, ...]:
    """L1~3 单目标教学，L4~40 双目标，L41~200 三目标。"""
    if level <= 3:
        return (category,)
    if level <= 20:
        return EARLY_GOAL_SETS[(level - 4) % len(EARLY_GOAL_SETS)]
    if level <= 40:
        return ADVANCED_GOAL_SETS[(level - 21) % len(ADVANCED_GOAL_SETS)]
    return EXPERT_GOAL_SETS[(level - 41) % len(EXPERT_GOAL_SETS)]


def allocate_target_counts(level: int, task_ids: tuple[str, ...], total: int) -> list[int]:
    """在目标组之间均匀分配件数，并尊重小候选池任务的上限。"""
    counts = [1 for _ in task_ids]
    remaining = total - len(counts)
    cursor = level % len(task_ids)
    while remaining > 0:
        allocated = False
        for offset in range(len(task_ids)):
            index = (cursor + offset) % len(task_ids)
            if counts[index] >= TASK_CAPS[task_ids[index]]:
                continue
            counts[index] += 1
            remaining -= 1
            cursor = (index + 1) % len(task_ids)
            allocated = True
            break
        if not allocated:
            break
    return counts


def level_type_for(level: int) -> str:
    slot = level % 20
    if slot == 0:
        return "boss"
    if slot in {7, 17}:
        return "cluster"
    if slot == 9:
        return "mist"
    if slot == 12:
        return "night"
    if slot == 15:
        return "speed"
    return "standard"


STAR_GATES = {
    21: 15,
    41: 45,
    61: 80,
    81: 120,
    101: 165,
    121: 215,
    141: 270,
    161: 330,
    181: 395,
}


def main() -> None:

    fieldnames = [
        "level", "chapter", "category", "type", "targetCounts", "distractors",
        "timeLimitSec", "starBase", "star2", "star3", "starUnlockReq", "taskIds",
    ]
    rows: list[dict[str, object]] = []
    for level in range(1, LEVEL_COUNT + 1):
        chapter = (level - 1) // 20 + 1
        level_type = level_type_for(level)
        category_index = ((level - 1) * 3 + chapter - 1) % len(CATEGORIES)
        category = CATEGORIES[category_index]
        task_ids = tasks_for_level(level, category)
        desired_total = total_target_count(level, level_type)
        counts = allocate_target_counts(level, task_ids, desired_total)
        count = sum(counts)
        type_bonus = {"boss": 2, "mist": 2, "cluster": 1}.get(level_type, 0)
        distractors = min(48, 34 + round((level - 1) * 0.075) + type_bonus)
        time_limit = round((40 + count * 7) * TYPE_COEFFICIENT[level_type])
        star_base = theoretical_max(count, time_limit)
        rows.append(
            {
                "level": level,
                "chapter": chapter,
                "category": category,
                "type": level_type,
                "targetCounts": "|".join(map(str, counts)),
                "distractors": distractors,
                "timeLimitSec": time_limit,
                "starBase": f"{star_base:.2f}",
                "star2": f"{star_base * 0.55:.1f}",
                "star3": f"{star_base * 0.75:.1f}",
                "starUnlockReq": STAR_GATES.get(level, ""),
                "taskIds": "|".join(task_ids),
            }
        )

    with LEVELS.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    print(f"upgraded {len(rows)} levels: {LEVELS}")


if __name__ == "__main__":
    main()
