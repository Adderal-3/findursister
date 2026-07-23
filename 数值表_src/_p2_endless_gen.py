# -*- coding: utf-8 -*-
"""P2 无尽模式难度曲线生成脚本（第 1~40 波）
口径见数值表_src/endless_notes.md；数值全部由本脚本计算，不手算。
"""
import csv, os

HIGH_PRESSURE = {15, 25, 35}   # 高压波：copies=3 且 distractors+10

# ---- 清关耗时估算模型（普通玩家口径，详见 notes.md） ----
# expectedClearSec = F*(a + b*items/110) + c + m(w)*WRONG
A_BASE = 2.0      # 每份基础定位+点击秒数
B_CLUTTER = 2.0   # 密度修正系数（按场景容量 110 归一）
C_OVERHEAD = 3.0  # 每波固定开销：读目标栏/镜头复位
WRONG = 3.0       # 点错惩罚秒数（WRONG_PENALTY_SEC）
def mistakes(w):  # 每波期望点错次数
    return 0.5 if w < 10 else 1.0

START_SEC = 75.0  # ENDLESS_START_SEC
FIND_BONUS = 2.0  # ENDLESS_FIND_BONUS_SEC
TIME_CAP = 99.0   # ENDLESS_TIME_CAP

def wave_row(w):
    target_types = min(3 + (w - 1) // 4, 5)
    if w < 3:
        copies = 1
    elif w in HIGH_PRESSURE:
        copies = 3
    else:
        copies = 2
    distractors = min(26 + w * 4, 90) + (10 if w in HIGH_PRESSURE else 0)
    total_finds = target_types * copies
    cross_theme = 1 if w >= 3 else 0
    type_coef = 1.0
    # 契约时间公式（参考口径）：T = round((45 + n*8) * typeCoef)
    time_limit_ref = round((45 + total_finds * 8) * type_coef)
    items = total_finds + distractors
    expected_clear = total_finds * (A_BASE + B_CLUTTER * items / 110.0) \
        + C_OVERHEAD + mistakes(w) * WRONG
    return [w, target_types, copies, total_finds, distractors, cross_theme,
            type_coef, time_limit_ref, round(expected_clear, 1)]

rows = [wave_row(w) for w in range(1, 41)]

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "endless_curve.csv")
with open(out, "w", newline="", encoding="utf-8") as f:
    wcsv = csv.writer(f)
    wcsv.writerow(["wave", "targetTypes", "copiesPerTarget", "totalFinds",
                   "distractors", "crossTheme", "typeCoef", "timeLimitRef",
                   "expectedClearSec"])
    wcsv.writerows(rows)

# ---- 时间银行模拟：普通玩家能打到第几波 ----
def simulate(speed=1.0, start=START_SEC, bonus=FIND_BONUS, cap=TIME_CAP, maxwave=40):
    """speed: 清关耗时倍率（1.0=普通）。返回 (死亡波次, 轨迹, 总耗时, 总找物)"""
    T, traj, tot_t, tot_f = start, [], 0.0, 0
    for r in rows:
        w, _, _, F, _, _, _, _, clear = r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8] * speed
        if T + F * bonus < clear:          # 本波内破产：可用时间 < 清关耗时
            return w, traj + [(w, round(T, 1), clear, None)], tot_t + T + F * bonus, tot_f
        T = min(T - clear + F * bonus, cap)
        traj.append((w, round(T, 1), round(clear, 1), round(T, 1)))
        tot_t += clear
        tot_f += F
    return maxwave + 1, traj, tot_t, tot_f  # 活过 maxwave

print("CSV written:", out, "rows:", len(rows))
print()
print("=== 普通玩家 (speed=1.0) 时间银行轨迹 ===")
death, traj, tot_t, tot_f = simulate(1.0)
for w, Tin, clear, Tout in traj:
    print(f"wave {w:>2}: 入{Tin:>5}s  耗{clear:>5}s  出{('破产' if Tout is None else str(Tout)+'s')}")
print(f"死亡波次={death}, 单局总耗时≈{tot_t:.0f}s, 累计找物={tot_f}")
for s, name in [(0.8, "偏快×0.8"), (1.2, "偏慢×1.2"), (0.7, "高手×0.7")]:
    d, _, tt, ff = simulate(s)
    print(f"{name}: 死亡波次={d}, 总耗时≈{tt:.0f}s, 累计找物={ff}")
print()
print("=== 灵敏度：回血/起始时间旋钮 ===")
for bonus in (2.0, 2.5, 3.0):
    d, _, _, _ = simulate(1.0, bonus=bonus)
    print(f"回血+{bonus}s/个 -> 死亡波次 {d}")
for st in (75, 90, 99):
    d, _, _, _ = simulate(1.0, start=st)
    print(f"起始{st}s -> 死亡波次 {d}")
print()
print("=== 场景容量检查（目标+干扰 总数，代码注释软上限约110） ===")
for r in rows:
    tot = r[3] + r[4]
    if tot > 110:
        print(f"wave {r[0]}: {r[3]}+{r[4]}={tot} 超 110!")
print("最大场景物品数 =", max(r[3] + r[4] for r in rows))
