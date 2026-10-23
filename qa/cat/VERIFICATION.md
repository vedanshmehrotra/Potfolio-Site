# Approved parrot integration and local cat review — 22 October 2026

## Delivered boundary

- Main studio: approved parrot is integrated via `parrot.js` and `assets/parrot/`. The review and main studio share the same instance/atlas; no second bird or QA asset dependency is added to production.
- Cat: local `/qa/cat-review.html` only. The main studio makes no request for the experimental cat assets/module and retains its original cat. User approval is required before cat promotion/push.
- The three approved MP4 files retain their recorded hashes. No room composition or source artwork was overwritten. No commit, remote push or deployment was performed.

## Executed validation

JavaScript syntax checks passed for `parrot.js`, both review modules, the cat compositor, and the capture script.

Initial parrot promotion run: **9 passed** (`qa/parrot/integration-tests.json`).

Combined animal check:

```
npx playwright test tests/cat-prototype.spec.cjs tests/parrot-integration.spec.cjs tests/parrot-prototype.spec.cjs tests/studio.spec.cjs --grep 'Experimental cat|Actual lamp transition|Real pet hotspot|Reaction pixels|Both sequences|Reduced motion, keyboard review|Public studio|missing decorative|Approved parrot|Breathing|Transparent poses|Lighting follows|Project zoom freezes|Pause, keyboard|Matched room|locked video bytes|lamp plays' --reporter=list,json --output=test-results/animal-integration
```

The combined run passed **16 of 17**, with one comparison-setup failure. The remaining pixel test then passed on a focused rerun after the setup correction. All **17 distinct checks have passing results across these runs**, rather than a single clean full invocation. See `integration-tests.json` and `pixel-check-rerun.json`.

Coverage includes:

- Main parrot startup, public/QA boundary, one-instance review, asset-failure fallback, real lamp clip, dark/lit endpoint, 8 FPS timing, original video hashes, foot registration, mobile/tablet placement, reduced motion and Projects entry/return.
- Main cat remains untouched; experimental resting overlay is entirely clear.
- The real lamp starts a 20-tick notice reaction; it ends and clears all local pixels. The actual cat hotspot/preview Pet button retains the existing opt-in purr. Duplicate petting does not restart the visual reaction or stack purrs.
- Both cat reactions pause during section navigation, return to the original cat afterward, and respect reduced motion. Close-up controls remain within 320/390px viewports and keyboard operation works.
- Matched original room screenshots show **1219 changed pixels inside the local cat area, zero outside the canvas, and zero in the protected window/body/paw/tail regions** for the inspected notice pose. The strict zero assertions were retained.

## Issues caught during testing

The first cat test run caught a real review UI issue: its close-up panel covered the studio's sound control. The panel now leaves the sound control accessible. The reference review also started two iframe navigations; the second could interrupt script loading. Both review pages now initiate exactly one studio navigation after their controls are initialized.

The full-room pixel test initially included the parent close-up panel because an iframe-element screenshot still captures panels overlapping its screen rectangle. That magnifier was hidden for the room comparison. Toggling the local canvas to `display:none` then caused two unrelated scaled CRT edge pixels to differ by a single RGB value. Comparing the reaction against the cleared resting canvas, while retaining the same compositing tree, removed that test artifact. The final comparison uses actual rendered room pixels and retains zero outside/protected-pixel assertions.

## Visual evidence and limits

`scripts/capture-cat.cjs` captures the integrated main studio, original cat, notice/pet close-ups, all sampled poses, a phone view and actual lamp/petting playback. These room stills and pose sheets were inspected. `browser-diagnostics.json` contains the real-time pose history/timing and browser page errors; `lamp-and-petting.webm` is the actual browser recording. The recording is silent; the existing opt-in purr is separately exercised in the browser test.

This is a restrained eye/inner-ear/cheek experiment. It does not provide a large head lift or full-body reaction, and no seamless-animation claim is made. The user's visual decision is the next gate.

## Asset record

- Canonical parrot atlas SHA256: `065A7C6BD7954BD27A092F3B814BFCE3FB040FDAA575679BC52FF8F67232B8B8`, matching the approved prototype.
- Local eye-expression SHA256: `2C25BEFB18E73418B2DB892BBA171E571F1DFD7F9577B34959C9EC434A7467A4`.
- `GENERATION.md` records the built-in image-generation method and exact prompt. Only tiny eye regions from that generated reference are consumed; head/ear movement samples the original video.
