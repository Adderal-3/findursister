# Design QA

- Source visual truth: `C:\Users\Admin\AppData\Local\Temp\codex-clipboard-1842d939-2fe6-427f-b900-a181f20719d2.png`
- Implementation evidence: `D:\小游戏\find0721\find0721\find\findursister\.codex-temp\design-qa\menu-ds-buttons-390x844-v4.png`
- Target viewport: 390 × 844 CSS px
- State: main menu, local preview mode. DS task and role APIs intentionally use their safe local fallback because production ACT and leaderboard IDs are not configured.
- Scope: the screenshot is a layout reference for the menu controls, not a request to replace the existing ancient-style background or art direction.

## Full-view comparison

- The stamina card is now isolated at the upper-left, matching the reference hierarchy.
- Role binding is centered near the top and does not compete with the title plaque.
- The three game controls form a bottom cluster: smaller leaderboard on the left, oversized primary start button in the center, and smaller endless mode on the right.
- Task is a separate circular control above the right side of the cluster, following the reference rather than becoming a fourth peer game-mode button.
- Existing warm paper, carved wood, and ink-game visual tokens are preserved while the control hierarchy follows the supplied screenshot.

## Focused control QA

- All controls use the same real circular raster backplate asset; blue, rose, and gold tonal treatments distinguish function without introducing mismatched button geometry.
- Primary and secondary controls have distinct size tiers and remain inside the 12 px mobile gutter at 390 px.
- Controls have accessible labels and real click handlers.
- The start and endless buttons retain stamina precheck behavior.
- The leaderboard opens a working modal and falls back to local records when DS leaderboard IDs are absent.
- The task button remains visible but disabled in local preview until a real ACT ID is supplied.
- Entry elements no longer begin at zero opacity, preventing buttons from disappearing in screenshots or during initial rendering.

## Verification

- Content validation passed: 123 unique items, 100 levels, 97 multi-target levels, 72 compound goals.
- ESLint passed.
- TypeScript production build passed.
- Vite production build passed.
- `git diff --check` passed.

## Known deployment dependency

- Live DS task and role binding cannot be production-verified without `VITE_DS_ACT_ID`.
- Live remote leaderboard cannot be production-verified without dev/pro mini-game IDs and dev/pro billboard IDs.
- These are external configuration dependencies rather than local UI defects; safe local fallbacks are active.

final result: passed
