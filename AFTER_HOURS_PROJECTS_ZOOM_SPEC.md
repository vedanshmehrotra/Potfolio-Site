# After-Hours Developer Studio — Projects Screen-Entry Transition
## Design specification + Codex implementation handoff (v1)

**Status:** approved *direction*, NOT implemented. This spec defines the first interactive website transition, not a new room illustration or video effect.

**Existing approved assets:**
- `after_hours_dark_ambient_canonical_v1_4s.mp4` — locked dark room ambient loop.
- `after_hours_lit_ambient_breathing_v3_4s.mp4` — locked lit room ambient loop.
- `After_Hours_Canonical_Transition_Clean/after_hours_transition_clean_2s.mp4` — previous lamp activation transition with the broken cat head motion removed. Keep this independent of the Projects zoom.
- `after_hours_canonical_dark_master.png` and `after_hours_canonical_lit_frame_v1.png` — source references for static fallbacks. The source artwork is 1672 × 941; encoded videos are 1672 × 942 due to padding. Use video coordinates as the scene coordinate system.

Do not alter any of these assets to add the Projects zoom. In particular: do not regenerate the room or cat, recolor the board, resimulate rain, or warp existing pixels. The camera interaction must wrap the existing scene.

## A. Intended experience

The visitor clicks/taps the main Projects monitor in the room. A rapid, authored, pixel-stepped camera move dives into that **specific monitor**. Sparse warm-white/cool-cyan comic speed strokes appear at the sides only during the fast section. The on-screen Projects interface then becomes a **real, keyboard-accessible, CMS-driven** interactive interface without a reload. Reverse via Back/Escape/browser Back.

**Style:** authentic medium-detail pixel art, game-like but still credible as an engineering portfolio; no glitch spam, neon overload, motion blur, camera shake loops, random particles, or distracting 3D effects. No AI-generated replacement visuals.

**Baseline timing (desktop)**: 700 ms ± 100 ms for entrance; ~500–600 ms return.

| Time | Camera and effect | Destination UI |
|---|---|---|
| 0–90 ms | Hit acknowledgment, faint monitor glow pulse, block duplicate clicks | Preloaded but inactive |
| 90–200 ms | Brief focus pull / initial approach | Hidden |
| 200–510 ms | Rapid zoom in 10–12 *discrete, hand-tuned* camera steps | Keep monitor live overlay pixel-aligned |
| 510–625 ms | Monitor display nears viewport bounds; speed lines disappear; 1-frame CRT-like seam-hiding scanline optional | Opaque matched UI fills scene portal |
| 625–700 ms | Camera stops; landing is stable | Accessible Projects carousel active, focus moved to heading or selected project |

These are targets, not arbitrary hard-coded pixel scales. Visual stepping ~16–20 logical updates/sec during the rush; underlying room video retains its approved 8 unique visual frames/sec in a 24 FPS MP4. Do not set the full browser's render FPS to 8. Camera rendering should use transforms, with held keyframe values for discrete motion.

**Speed lines:** 4–7 short off-white/cyan pixel strokes total, weighted to the edges, appear only from ~220–540 ms. They must not cover the project cards. Simple SVG/CSS lines or a small authored PNG sprite sheet, not an external image lookup or full-screen starburst. No long chromatic aberration. Optional low-intensity one-frame impact at the end, no shake in normal movement.

**Click feedback:** keyboard activation works exactly like mouse click; cursor is custom where allowed but standard pointer and focus ring remain legible.

## B. The non-negotiable architecture issue: baked screen versus live CMS data

**Problem:** The current room MP4 already has sample projects/text rendered into the monitor. Those baked pixels will not update when projects change via the admin CMS.

**Solution:** A **live, opaque Projects Monitor layer** occupies only the inner screen rectangle of the room; the existing bezel and neighboring artwork remain from the locked video. The live layer and the expanded Projects experience render from **the same project data source and UI tokens**. Underlying baked cards must not peek out around the replacement. Match frame, background, typography, palette, card geometry, arrows and indicator arrangement as closely as practical. No opacity crossfade that reveals two different sets of cards on top of each other.

Recommended first-pass implementation:
1. Use the approved room MP4 as the full-scene background (`object-fit: contain`). Keep one unified scene coordinate system.
2. Render an opaque HTML/CSS Projects miniature UI **within a calibrated monitor-inner-screen clipping rectangle** as a child of that scene.
3. The miniature UI receives live project data. It may simplify text for tiny sizes, but it must show authentic project names/cover assets (or explicitly labeled preview data when real projects are not yet supplied).
4. Zoom the scene and the monitor layer **together**, with exactly the same transform and origin. On the final rush state, expand a matching full-size Projects interface over the monitor area during a single intentional screen-fill/scanline reveal. Screen content must not drift or flicker.
5. Once expanded, stop/pause scene rendering behind the now-opaque panel if needed for performance. Keep its cached visual frame available for the reverse zoom.

**Calibration starting point, NOT guaranteed pixel-perfect:** scene/video 1672×942; outer monitor roughly x=520..1105, y=303..593; inner screen roughly x=538..1094, y=338..577. Do a manual pixel-level browser calibration at 100%, 125%, and retina/device pixel ratio; do **not** ship these guesses without testing. Keep a development outline toggle for alignment, and disable it in production.

### Scene coordinate math

For `contain` framing at viewport `(vw,vh)` and source `(1672,942)`:

```
s = min(vw / 1672, vh / 942)
sceneLeft = (vw - 1672*s) / 2
sceneTop  = (vh - 942*s) / 2
onscreenX = sceneLeft + sourceX*s
onscreenY = sceneTop  + sourceY*s
```

Derive monitor and hotspots from source-image coordinates; never scatter pixel positions across media-query CSS. On resizing, recalculate source-to-viewport mapping. Avoid `object-fit: cover` on the room if it would crop click targets.

A camera transform that maps the monitor screen into the viewport must be computed from its actual onscreen rectangle and chosen landing crop. **Do not** use a hard-coded 3× transform, because monitor-to-viewport scaling changes with viewport and aspect ratio. Final Projects UI is laid out independently and responsively: do not leave website text as a blurry blown-up screenshot.

### Maintain pixel appearance

- Use nearest-neighbor/pixel-preserving scaling for *raster* scene or authored sprite overlays where supported; don't pixelate native UI type unnecessarily.
- CSS `image-rendering: pixelated` may behave differently at noninteger scales; verify in actual browsers and avoid claiming guaranteed perfect output from it alone.
- A practical approach is to capture the current video frame into a same-origin canvas **once at click time** (or use a known 8 FPS frame asset) and zoom that stable snapshot while live DOM content stays overlaid. Don't generate art per frame. Capture must match the currently displayed animation state (no flash to an unrelated poster frame).
- Quantize the **camera animation values** to an authored set of 10–12 steps. Do not round every element's individual position separately, causing jitter between screen and bezel.
- Continue to respect the real room MP4 and the separate lamp-activation state. The user should be able to open Projects in dark or lit mode; clicking Projects must not automatically turn on the lamp.

## C. Projects destination design

Landing interface is a pixel-conscious, legible desktop-style project viewer, **not** another scrolling marketing landing page.

- Centered title `Projects`, restrained top-left **Back** arrow.
- Horizontal project selector with left/right buttons, keyboard arrows, swipe/drag only if appropriate. Make card sizes responsive and readable.
- Selecting a card opens a professional project case study **inside the same experience**, with problem, engineering decisions, tech stack, implementation evidence, images, limitations and external links. Don't replace engineering substance with game gimmicks.
- Optional text scramble: only a brief heading reveal (120–220 ms); never scramble paragraphs, accessibility labels, or important facts.
- Project detail Back returns to carousel; Projects Back returns to the room via the reverse zoom. Preserve last selected project.
- Deep links to projects (`/projects/{slug}` or an existing compatible route), usable on refresh. Browser Back must behave predictably.
- Explicit empty/error states if there are no projects; do not fabricate portfolio projects.

## D. State machine (small and robust)

`room.dark` / `room.lit` → `enteringProjects` → `projects.list` → `projects.detail` → `projects.list` → `leavingProjects` → previous `room.dark/lit`.

Lamp-state playback controller and navigation transition controller are **separate**. Block duplicate clicks and prevent `enter`/`exit` overlap. Cancel/restore safely on browser navigation, resize, reduced-motion setting change, or component unmount.

During transition temporarily disable inactive hit regions; after arrival move focus to Projects heading or first actionable control. On return move focus back to the Projects monitor hotspot. Escape works from the top-level Projects list (and from detail to list first if detail is open). Use actual `<button>` / `<a>` elements and appropriate accessible labels. No dead-end fullscreen layer.

## E. Admin / CMS compatibility — preserve now, implement when ready

Projects miniature UI and expanded carousel consume exactly the **same typed project model/service**, not a hard-coded array in two components.

Suggested model, adapt to existing stack and database:

```
Project {
  id, slug, title, shortSummary, coverImage,
  tags[], technologies[], problem, approach, outcomes,
  gallery[], repositoryUrl?, liveUrl?, featured,
  sortOrder, status: 'draft' | 'published'
}
```

- Public UI reads published records; admin can create/edit/reorder/publish without re-rendering the entire room MP4.
- A private `/admin` route is not secure on its own: use authenticated authorization server-side for mutations; protect uploads and avoid exposing drafts or credentials.
- Use one `ProjectRepository`/service boundary so an initial in-memory fixture can later be replaced with the actual backend/database without rewriting transitions.
- Project metadata and text stay actual HTML and remain searchable, shareable and accessible. Don't flatten case studies to art assets.
- Keep the transition independent of whether the admin UI exists yet. No need to construct the whole CMS before proving the zoom.

## F. Performance, responsiveness and accessibility

- One animated camera layer and a small, bounded speed-line overlay. No WebGL/Three.js/PixiJS for this initial transition.
- Do not re-render the full React tree each animation step. Use transform-driven animation values or Web Animations API; avoid layout reads during animation.
- Freeze/hide the MP4 only while necessary and resume the selected dark/lit loop when returning. Make sure its playback remains deterministic and the poster state doesn't flash.
- Preload project thumbnails needed for first screen; lazy-load case study media.
- On mobile/coarse pointer: shorten zoom (~350–450ms), reduce or disable speed lines, and use a clear fallback Projects button if monitor hotspot becomes too small.
- Honor `prefers-reduced-motion`: no rush/scale; use a ≤150ms simple state change. Keyboard and screen-reader navigation must still work.
- Avoid auto sound; if sound is added later, it should be optional and off by default.
- Provide reasonable low-end laptop performance; measure FPS / input delay, not just screenshots.

## G. Tool selection (keep it small)

**Primary:** Codex working directly inside the actual existing website repo, with browser access for Playwright checks.

**Preferred implementation:** If existing repo uses React, use existing styling + `motion` (MIT) if needed for a simple camera animation, or use native Web Animations API/CSS if it is just as clear. Do not introduce React/Next.js into a different existing stack merely for this effect.

**Free optional reference tool:** Motion documentation MCP `https://mcp.motion.dev` (public docs server, no account); for Codex CLI, `codex mcp add motionDocs --url https://mcp.motion.dev`. It is optional, not required to animate the site. For animation QA use free Playwright browser tests; no extra paid builder, Awwwards product, or image generator required.

**Do not use Lenis for the zoom.** Lenis is for scrolling content, not camera transforms. Introduce later only if case-study scroll genuinely needs it.

References: https://github.com/motiondivision/motion (MIT); https://github.com/darkroomengineering/lenis (MIT); https://playwright.dev/docs/test-snapshots; https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering; https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion

## H. Implementation sequence — build and review in phases

### Stage 0: inspect actual repo
- Identify framework, pages, runtime, current data flow, styles, static assets, breakpoints, and build commands. Do not rewrite working architecture.
- Verify the two approved room videos and their file paths; copy assets into project public directory if missing, unchanged.
- Capture initial screenshots at desktop 1440×900 and 1920×1080, mobile 390×844, one mid-width/tablet. Set baseline.

### Stage 1: the aligned live monitor
- Implement responsive contained room scene and `sceneToViewport` mapping.
- Create monitor screen clipping layer matching approved bezel; connect it to a small project data adapter.
- Create transparent semantic Projects hotspot, hover/focus highlight. No zoom yet.
- Verify no clipped screen pixels, missing border, or duplicate baked project cards at target breakpoints.

### Stage 2: camera prototype
- Implement simple state controller and ~700ms step-keyframe camera entrance and return.
- Add calibrated speed-line artwork with little or no shake. Take screenshots mid-transition.
- Do NOT implement new room art, animations, the CMS admin panel, or speculative new sections.

### Stage 3: destination UI
- Build responsive Projects carousel and a single representative real case-study template from existing data; wire navigation, history, Back/Escape and focus.
- Use exact same project data source in monitor and expanded view.
- Make deep links functional. Avoid made-up project claims; use clear placeholders only for UI development.

### Stage 4: integration and polish
- Test click in dark and lit modes, return transitions, rapid repeated clicks, resizing, keyboard only, reduced-motion and mobile fallback.
- Run Playwright screenshots with consistent browser baseline and video timestamps; report screenshot differences, don't simply say "looks good".
- Add a temporary dev-only debug overlay for screen rectangles, transforms and measured timing; remove before final.

## I. Definition of done (Codex must show evidence)

1. In-room project viewer and expanded UI share published CMS-compatible project data.
2. Camera approaches the center of the actual monitor, not arbitrary screen center; no wrong zoom origin or edge jumps.
3. From click through landing there is no blank frame, hard navigation reload, duplicated screen text, detached bezel, or mismatched underlying asset.
4. Projects and Back work at desktop, phone, and keyboard-only; URL and browser Back work on refresh/deep links.
5. The approved dark/lit room video bytes are not edited. Lamp state remains independent.
6. Under reduced motion there is no large camera zoom; content stays accessible.
7. Codex provides local preview instructions, screenshots/video of entry and exit, tests run, known limitations and changed files. Do **not** claim pixel perfection until the user reviews the recorded browser output.

## J. Copy/paste prompt for Codex

> You are implementing the first interactive Projects screen-entry transition of my After-Hours Developer Studio portfolio. Read `AFTER_HOURS_PROJECTS_ZOOM_SPEC.md` completely before writing code. Inspect the existing repository and its framework and keep its architecture. Implement a real zoom from the projects monitor in the approved pixel-art room to a CMS-ready Projects interface, not an MP4 zoom animation. Keep my approved dark and lit ambient assets byte-for-byte unchanged. The monitor artwork currently contains baked project cards, so build a correctly aligned live opaque monitor UI from the same data as the expanded Projects interface. Stage the transition with a ~700ms pixel-stepped camera dive, sparse edge-only speed lines, quick matched UI landing, and reverse zoom. Preserve dark/lit lamp state independently. Avoid WebGL, image regeneration, global blur, and unnecessary libraries. Make this responsive, keyboard-accessible, and reduced-motion friendly. Use Playwright to show entrance/exit screenshots or video, including alignment at multiple viewport sizes. Protect future `/admin` CMS compatibility through a shared typed Project model/service but do not overbuild the admin/backend just for this prototype. First return a short plan and proposed file edits, then implement and run tests. If exact monitor alignment needs my approval, expose a temporary dev-only calibration overlay and show me screenshots rather than guessing. Do not call it finished until the pixel-art handoff is visually verified.
