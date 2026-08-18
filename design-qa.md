**Comparison target**

- Source visual truth: `C:\Users\Admin\AppData\Local\Temp\codex-clipboard-0efa579b-1764-4d9e-9972-023e076cef0b.png`
- Rendered implementation: `D:\小游戏\find0721\find0721\find\findursister-github\.codex-temp\design-qa\timer-enhanced-428x939.png`
- Combined comparison: `D:\小游戏\find0721\find0721\find\findursister-github\.codex-temp\design-qa\timer-comparison-side-by-side.png`
- Viewport and pixels: source 428 × 939 px; implementation 428 × 939 CSS px and 428 × 939 px at deviceScaleFactor 1. No density normalization was required.
- State: level 1 actively counting down, target bar visible, gameplay controls visible.

**Full-view comparison evidence**

- The revised header keeps the same overall footprint and existing plaque/button assets, so the target bar and playable scene are not displaced.
- The timer is now the first-read element: a centered cream capsule with 18–20 px tabular numerals replaces the previous 10 px mixed metadata line.
- Level and compact-formatted score share a centered metadata row above the timer, contained inside the plaque's safe interior instead of occupying narrow side columns.

**Focused region evidence**

- A separate crop was not needed because the 428 px full-view comparison renders the complete header at legible 1:1 scale.
- The urgent state was tested at 00:05: the capsule switched to vermilion, retained a pale border, and pulsed without changing layout.

**Findings**

- No actionable P0, P1, or P2 issues remain.
- Fonts and typography: the existing display face is preserved; the timer uses a larger optical weight, tabular numerals, and increased tracking.
- Spacing and layout rhythm: the plaque stays 48 px high; the stacked layout does not overflow at either 428 px or the supported 320 px minimum width.
- Colors and visual tokens: the cream/brown timer uses the existing warm Qingya palette; the urgent vermilion state has clear contrast.
- Image quality and asset fidelity: all existing plaque and round-button assets are preserved without replacement or stretching.
- Copy and content: level, remaining time, score, and task target copy remain intact.

**Comparison history**

- Iteration 1 finding (P2): the countdown was a 10 px fragment inside a combined time-and-score line, so it did not read as a primary gameplay constraint.
- Fix: separated the countdown into a centered high-contrast capsule, enlarged the numerals, moved level/score to secondary side positions, and added an urgent-state color change.
- Post-fix evidence: the side-by-side comparison shows the timer as the clearest element in the top plaque while the target bar and game field retain their prior positions.
- Iteration 2 finding (P2): the left/right metadata columns could encroach on decorative edges as level and score values grew.
- Fix: moved both metadata values into one centered row above the timer, limited that row to the plaque's safe interior, compact-formatted large scores, and retained truncation as a final guard.
- Post-fix evidence: at 428 px the metadata stays within a 192 px safe region inside the 288 px plaque; at 320 px the 184 px plaque, 104 px timer, and metadata row all remain inside bounds with no page overflow.

**Implementation checklist**

- [x] Normal countdown state is prominent.
- [x] Last-10-seconds state is visually distinct.
- [x] Header remains responsive at the supplied mobile viewport.
- [x] Start-game interaction works and the countdown updates.
- [x] Browser logs contain no errors.
- [x] ESLint and production build pass.

**Follow-up polish**

- No blocking follow-up polish is required for this change.

final result: passed
