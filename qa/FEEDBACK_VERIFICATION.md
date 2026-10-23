# Sound and cursor verification — 22 October 2026

This records the initial sound/cursor implementation. The subsequent audio-level, bulb-hint and inline-validation revision is documented in `AUDIO_LAMP_VALIDATION_VERIFICATION.md` and previewed in `audio-lamp-review.html`.

## Story

A visitor enables sound, the browser loads same-origin CC0 rain/purr recordings, decodes them into Web Audio, and mixes them with quiet procedural object cues. Contextual pixel cursors follow actionable objects, dragging, text entry and genuinely pending contact submissions. Room artwork and camera behavior remain intact.

## Evidence

| Boundary | Result | Evidence |
| --- | --- | --- |
| Initial browser load | Muted, no audio context or recording requests | Focused opt-in test |
| Local sound files → decoder | Both recordings decode successfully | `feedback-diagnostics.json`; source digests in `assets/audio/sources.json` |
| Audio graph → output | Nonzero analyser output, silent after mute/zero volumes | Focused actual-signal tests; `room-sound-preview.webm` records the browser mix |
| Object activation → appropriate cue | Lamp, monitors, carousel, board, journal, notes, phone and purr mapped to actual actions | Focused interaction tests; hover remains silent |
| Contact pending → cursor and confirmation | Hourglass follows `aria-busy`, survives leaving/returning, clears on resolution; confirmation only follows success | Controlled send promises; **no real email sent** |
| Cursors → input/fallback | Static arrow/point/grab, animated cat/wait, native text cursor; fallback remains visible if a sheet fails | Focused mouse, touch, missing-asset and forced-color tests |
| Accessibility → controls | Global controls reachable within section keyboard navigation, separate levels, Escape closes settings first; reduced motion freezes sprites | Focused tests plus updated existing keyboard tests |
| Existing studio → regression | Lighting, camera, history, CMS fixtures, CV bytes and locked video hashes verified | Full regression and capture rerun reports |

## Executed checks

- Initial 69-test run: **66 passed**, three screenshot-save failures opening older `qa/` images. Interaction assertions were not weakened to handle these failures.
- Subsequent 71-test run: **69 passed**, two remaining screenshot-save failures from test modules loaded before the remaining artifact-path edits. Report: `feedback-regression.json`.
- Both outstanding tests then passed with fresh per-run paths: **2 passed (26.3s)**. Report: `feedback-capture-rerun.json`.
- Final focused run after the in-flight Contact fix: **12 passed (46.3s)**. Report: `feedback-focused-final.json`.
- All **71 distinct tests** have passing results across the regression run and reruns. This is not a claim that the first full invocation passed.
- JavaScript syntax checked with `node --check` for `app.js`, `sections.js`, `audio.js` and `cursor.js`.

Automated screenshots now use Playwright's per-run output directories. Dedicated capture scripts maintain the browsable `qa/` review images, preventing these two workflows from overwriting the same older files.

## Visual and audio review

`feedback-review.html` includes actual-size sprites, the cat cursor, real pending-state hourglass, sound controls and a portrait contact capture. `feedback-resume-320.png` shows separate Back, Download PDF and compact sound controls on a 320px screen.

These checks use installed Chrome on this Windows host, including native touch emulation. The visibility handler test uses controlled visibility events; it is not evidence of a physical device or native tab-switch listening test. Audio decoding, signal output and a recorded browser mix are verified; the preview is supplied for human listening and subjective balance review. Live mail delivery remains part of the separate backend setup.
