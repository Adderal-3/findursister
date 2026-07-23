# Design QA

- Source visual truth: `C:\Users\Admin\AppData\Local\Temp\codex-clipboard-5fbdcb0c-0784-492c-a3d2-096b9e94bcbb.png`
- Implementation screenshot: `D:\小游戏\find0721\find0721\find\findursister\.codex-temp\design-qa\implementation-combo-final.png`
- Full comparison evidence: `D:\小游戏\find0721\find0721\find\findursister\.codex-temp\design-qa\comparison-passed-full.png`
- Focused top-HUD evidence: `D:\小游戏\find0721\find0721\find\findursister\.codex-temp\design-qa\comparison-passed-top.png`
- Viewport: 390 × 844 CSS px
- Source pixels: 852 × 1880, normalized to 390 px width and center-cropped to 390 × 844
- Implementation pixels: 390 × 844 at device scale factor 1
- State: both screens show the `sweet_plants` combination rule. The source depicts level 18 at 4/6 with combo ×3; the implementation depicts the configured formal level 40 at its initial 0/6 state. Structural fidelity was compared; progress and combo differences are expected live-game state differences.

## Findings

- No actionable P0, P1, or P2 mismatch remains.
- Fonts and typography: the implementation uses Noto Serif SC / Chinese serif fallbacks for display and task text. The hierarchy, optical weight, wrapping, and truncation match the selected target; the longest formal combination label fits at 390 px.
- Spacing and layout rhythm: fixed controls keep 12 px mobile gutters, the mission panel stays below the top HUD, and the field remains the dominant region. The top HUD is capped at 48 rem on wider screens so it does not stretch excessively.
- Colors and visual tokens: celadon, ivory, jade, muted teal, warm gold, and coral accents match the selected direction. Contrast remains sufficient over the generated background.
- Image quality and asset fidelity: the standalone 1536 × 1024 background is crisp, and the mission frame, level plaque, and circular button backplate are real generated raster assets with cleaned alpha edges. Existing item sprites are reused without placeholder art.
- Copy and content: the combination task label, level title, timer, progress, score/combo slot, return, pause, and hint controls are present and readable.

## Comparison History

1. Initial implementation showed clipped items at the first viewport boundary, a truncated level title, intermittent mission-panel visibility during rapid reloads, and a possible item/button overlap in the lower-left action zone.
2. Fixes applied: full-canvas seam safety, explicit mission-frame image rendering, target-first packing, fixed-control exclusion zones, a constrained desktop HUD width, larger item sizing, and responsive long-label typography.
3. Post-fix evidence: the final 390 × 844 comparison shows fully visible items, readable task copy, stable generated controls, and no overlap with fixed buttons. A 300-scene formal-level stress run completed with all targets placed.

## Browser Verification

- Primary interactions tested: start formal mode, pause, continue, replay/retry, and render a formal combination task.
- Fresh-tab console check: no warning or error entries.
- Build checks: content validation, ESLint, TypeScript, and Vite production build passed.

## Follow-up Polish

- P3: the source mock has a slightly brighter turquoise river and a larger active combo flourish. These can be tuned later without changing layout or gameplay.
- P3: the comparison uses different live progress and combo states; a future screenshot harness could force identical counters for pixel-level state comparison.

final result: passed
