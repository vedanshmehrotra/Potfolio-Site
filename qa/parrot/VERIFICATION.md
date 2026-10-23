# Parrot prototype verification — 22 October 2026

Scope: a separate review page adds a transparent parrot to the existing studio. Production `index.html`, room artwork, videos and existing cat were not modified during this stage. No backend or external messages were involved.

## Executed checks

- `node --check qa/parrot/parrot-preview.js`
- `node --check qa/parrot/review-page.js`
- `node --check scripts/capture-parrot.cjs`
- `npx playwright test tests/parrot-prototype.spec.cjs tests/studio.spec.cjs --grep 'Parrot|Breathing|Transparent poses|Lighting follows|Project zoom freezes|Pause, keyboard|Matched room|locked video bytes' --reporter=list,json --output=test-results/parrot-validation`

Eight selected tests passed in the focused run. A subsequent report run caught the paused-lighting endpoint described below, which was corrected before the final rerun. This is focused coverage; the entire existing studio suite was not rerun because production code is unchanged. See `test-results.json` for the final machine-readable report.

Verified behavior:

1. Main studio loads no parrot asset/module; exactly one pointer-transparent character canvas appears on the review page.
2. Breathing changes pose, preening completes and returns to rest. The requested clock is 125 ms per pose tick.
3. Transparent corners remain empty, with the gripping toes staying registered at the same height and within two source pixels horizontally across all 16 poses.
4. Lamp dark/lit state changes the sprite's lighting. Placement uses the same world transform at 1440, 768, 390 and 320 pixel viewport widths.
5. Projects entry freezes the current parrot pose; Escape/return resumes it.
6. Pause/resume, keyboard review controls, show/hide comparison, pose scrubbing and reduced motion work.
7. A matched, frozen original room screenshot differs by 1307 pixels with the parrot shown versus hidden, with **zero changed pixels outside the isolated canvas**.
8. All three locked video hashes match their existing records.

The first run had two test failures. One color-based toe detector was affected by the dark-room tint and included unrelated lower-body pixels; it was replaced by measurement of the actual opaque toe region. The screenshot comparison also included the timed lamp discovery glow; dismissing that independent animation before matched snapshots corrected the comparison. Assertions were retained: less than two source pixels of horizontal toe movement, at most one vertically, and zero outside-canvas changed pixels. A later rerun found an actual edge case: while pose playback was paused, the lighting update threshold could leave the sprite at .991 brightness after the room became fully lit. The compositor now always paints the exact dark/lit endpoints; the exact-brightness assertion remains.

## Rendered evidence

`scripts/capture-parrot.cjs` generated actual browser screenshots of the dark room, lit room, resting/preening close-ups, a sheet of all rendered poses and a 390px phone view. The room/close-ups and all-pose sheet were visually inspected.

`breathing-preening.webm` records an actual user workflow in the original ambient room with the close-up open. It does not contain the manual pose scrubbing/proof-sheet capture. `browser-diagnostics.json` records no browser page errors. Its 24 preen ticks have a mean interval of **125.17 ms**, with observed intervals of 116.4–133.8 ms due to display frame scheduling; see `timing-summary.json`.

The animation is a prototype for the user's visual choice. Functional checks and still-frame inspection do not establish perfect sprite consistency or subjective motion quality. No seamless-animation claim is made. The generated poses have small outline variations visible in the close-up.

Asset SHA256: `065A7C6BD7954BD27A092F3B814BFCE3FB040FDAA575679BC52FF8F67232B8B8` (`parrot-atlas-v1.png`). See `GENERATION.md` for the built-in image generation method and exact prompt.
