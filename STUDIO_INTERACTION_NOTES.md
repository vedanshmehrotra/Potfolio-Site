# Studio interaction notes — 21 October 2026

## Scope confirmed in this chat

The initial approved pass fixed the outlines, tooltips, CV download and Journey direction. The latest revision also authorizes the lamp interaction and discovery cue described below, plus more precise journal/book tracing. On 22 October the user accepted the sound/cursor direction and explicitly authorized implementation of both. The working version is described below; the browser mix and sprites are available for review.

## Current corrections

- Preserve the room composition, approved ambient videos, lamp activation clip, and selected smooth A camera with the current pixel streaks.
- Use object-shaped hit areas and thin matching hover/focus contours. A journal outline must not spill into the phone. The Journey contour must follow the angled board rather than its rectangular bounding box. Apply the same treatment to every existing clickable object.
- Replace browser-native title tooltips with one compact, pixel-shaped caption using the site's Tiny5 font. Examples: Projects, About me, Journey, Resume, Contact, Reading & notes. Preserve accessible button names and visible keyboard focus.
- The user approved using the attached October 2026 CV as-is, including its contact details. Serve an unchanged copy from the journal's top-right Download PDF control. Keep the recipient address out of the Contact form UI.
- Keep the phone's purpose and presentation consistent: it opens Contact. Keep typography and controls consistent across all sections.

## Journey direction

- Tell the professional journey: education, internships, responsibilities, challenges overcome, achievements and future roles.
- Avoid a travel diary or a wall of academic records. A sparse genuine history is preferable to invented adventures or padding.
- Use one School chapter; Class 10/12 marks can be supporting text inside that pin, without separate grade cards. University marks can also be optional supporting detail.
- Give the complete board more screen space. Selected details must stay readable; desktop can place them alongside the board, with details below on phones.
- Keep the existing room board static. The expanded board uses published records, uploaded photos, dates, descriptions, optional results, stable IDs and sort order. Use additional board pages when needed; do not shrink an unlimited number of pins onto one screen.
- The current five published pins cover University, AirBorneHRS, Robotics Club / General Secretary, Think Computers and academic recognition, in that order. Dates remain blank where unconfirmed. No project-start pins or repeated badge entries. Missing photos use small document symbols; uploaded photos override them. The admin supports up to 100 milestones, six per page. Do not invent grades, dates, employment or achievements.

## Resume recommendation

Keep two useful presentations: short, readable journal chapters on the website (Profile, Education, Experience, Skills), and the complete conventional PDF for recruiters. Chapter selection stays compact. Avoid reproducing a dense A4 document at an unreadable pixel scale. The actual web copy can be entered later; replacing the downloadable PDF should remain independent.

## Cursor — implemented 22 October 2026

- A small pixel arrow for ordinary navigation and a matching pixel pointer over interactive objects; use a native I-beam in editable text and preserve normal fallback cursors.
- No trailing particles, oversized cursor, forced pointer effects on touch devices, or animation that interferes with reading.
- Keep the compact caption near the pointer and within viewport edges. Keyboard focus gets the same label anchored to the object.

### Sprite discussion — 22 October 2026

The user proposed contextual cursor sprites, including an optional animated hourglass and a petting hand over the cat. Original code-drawn SVG sprites now implement these states without modifying room artwork.

- Default: a small cream pixel arrow with a dark outline, readable against both room lighting states.
- Clickable objects and controls: a matching pointing hand. Reuse it across the lamp, monitors, board, journal, phone and books rather than making every object a separate cursor language.
- Cat: a relaxed open hand on hover. A short, gentle petting gesture on activation could accompany the planned purr; the actual cat artwork/ambient animation remains unchanged. Keep hover movement restrained and review a sprite preview before choosing whether it should animate.
- Draggable room areas/carousel: an open grab hand, closing while a drag is active. Avoid implying that empty desktop areas can be clicked as objects.
- Text entry and selection: preserve the familiar native text cursor.
- Genuine waiting: optional hourglass sprite with sand draining, a short turn, then a repeat. It should reflect actual pending work, stop immediately when the work ends, and remain static with reduced motion. Do not add a forced loading screen or delay to showcase it, and do not use it during the camera zoom.
- Keep the pointer's click point stable, movement immediate, the existing small captions legible, and native fallback cursors available. Touch devices do not need a simulated cursor.

The hourglass is connected to the contact form's real `aria-busy` state. It is not shown for camera movement. Grab states reflect the existing narrow-screen room drag; touch devices have no simulated cursor. `qa/feedback-review.html` shows the family at actual display size and the animated cat/wait sprites. Reduced motion freezes animation and forced colors use the system cursor.

## Lamp behavior — implemented in the latest revision

- Clicking the lit lamp switches immediately back to the approved dark ambient loop. All lights/lanterns change together with the original room state. No reverse lighting video, fade-out sequence or invented animation.
- Turning the lamp on continues to use the supplied activation clip.
- Revision approved 23 October: remove discovery blinks and outlines. After the room assets, CMS content and controls are ready, wait 3.5 seconds of visible room time, then use the original activation clip automatically. Pause the remaining delay while a section is open or the document is hidden.
- Manual activation takes priority. After the visitor switches the light off, it stays off until they switch it on again. A fresh load starts dark with a fresh delay. Reduced motion switches directly to the lit loop without playing the activation clip. Localhost-only `reference=1` freezes visual QA captures and suppresses the automatic timer.
- Automatic lighting never unlocks audio; the existing trusted-interaction sound policy still applies.
- Hover captions still say Turn on lamp / Turn off lamp. Keyboard focus uses a small separate marker and the caption, without restoring the full shade contour after first use.
- Keep Projects visually primary. Avoid a large instruction banner, persistent pulsing halo or a bright outline that competes with the scene. Review the rendered cue in the actual dark room before choosing its strength.

### Contour refinement

- Trace the curved shade/collar/rim rather than approximating the lamp as a triangle.
- Trace the journal's complete right-hand page beyond the pen, binding and page stack.
- Trace the different book-spine heights as an uneven collection, without a single straight box around empty space.
- Keep the approved Journey frame contour and phone shape. Preserve the existing camera framing while calibrating hit bounds where needed.
- Visible strokes sit outside the clipped hit-area buttons so clipping does not cut half of each stroke away. All shapes share the room's source-coordinate transform.

## Audio — implemented 22 October 2026

The accepted sound direction is implemented as an opt-in browser mix. Recorded indoor rain by Sayuri_Odin and sleepy cat purr by Kerzoven are served locally with CC0 source/license records in `assets/audio/`. Quiet clicks, paper effects, retro tones and camera swells are synthesized in native Web Audio. Hover stays silent throughout. The captured browser mix in `qa/feedback-review.html` is provided for subjective listening review; automated output measurements are not a listening-quality claim.

### Sound design

- Ambient rain must sound like listening from inside a room through a window: soft, muffled rain with little close-up hiss. Do not use a loud, exposed outdoor microphone recording as-is.
- An additional quiet room tone or distant city layer is optional. Avoid a busy mix, loud thunder and automatic music.
- Clicking the cat gives a brief gentle purr. Keep the approved cat animation unchanged; do not invent a new animation. Limit repeated triggering so purrs do not stack.
- Projects monitor: a short computer/mouse click on entry.
- Green retro CRT: a distinct soft mechanical click, potentially with a very brief restrained electronic tone. Avoid harsh static/glitch noise.
- Journey board: a quiet paper/pin tap when selecting a memory. No sound on every hover.
- Resume: a soft page-turn sound when changing chapters inside the journal. Do not trigger page-turn audio merely for opening the journal.
- Bookshelf: a quiet cover/paper sound when opening or selecting a note, subject to review.
- Phone: a short mail-send confirmation only after the backend confirms the message was accepted. No successful-send sound for validation errors or failed delivery.

### Playback behavior

- Add a small accessible global sound control that stays available in every section. Audio begins only after a visitor enables it; provide mute and an appropriate volume control.
- Keep effects quiet relative to the rain, avoid stacking repeated effects, and stop/pause ambient playback when the page is not active.
- Keep source/license information and hashes with the recordings. `scripts/fetch-audio.py` reproduces their download. No runtime sound depends on a third-party host.
- Sound is muted on every fresh load; only independent rain/effect volume values persist. Muting or hiding the page stops voices; purrs never overlap and have a 3.2-second cooldown. Successful-send sound remains conditional on an accepted backend response; live delivery still requires the separate backend setup below.

### Audio and validation revision

- The previous mix was too quiet in the user's normal listening environment. Normalize the filtered rain/purr buffers with peak headroom, make clicks modestly louder and make the camera swell register clearly. Preserve independent levels and opt-in playback. A common soft ceiling protects combined output at maximum settings.
- The purr source is dominated by low bass (the inspected first 2.2 seconds had about 97% of spectral energy below 150 Hz). High-pass at 150 Hz, retain texture up to 2400 Hz, then normalize; simply increasing bass-heavy gain does not solve small-speaker audibility. The original recording file remains unchanged.
- Rain retains an indoor sound, filtered from 100 to 1700 Hz, with the existing loop crossfade. Automated tests check meaningful signal levels and combined peaks; the recorded browser mix is supplied for actual listening review.
- Contact validation belongs inside the app. Keep reply email optional, validate it when supplied, reject empty/short/oversized messages, show per-field pixel-styled errors with accessible associations, and focus the first invalid field. Disable native validation popovers with `novalidate`; leave backend validation intact.
- Cat reaction animation and the Alexandrine parrot are explicitly deferred to the next stage. Current room and cat artwork/ambient animation remain unchanged.

## Parrot review prototype — 22 October 2026

- The user accepted the smaller Alexandrine perched on the monitor and a shoulder-preening reference. Keep it smaller than the cat, with visible feet on the bezel. A fully visible long tail is unnecessary.
- Include gentle breathing and a preening sequence at **8 FPS**. The user authorized trying a short sample before deciding what to keep.
- `qa/parrot-review.html` runs the unchanged studio inside a review page and adds a transparent sprite to its existing coordinate world. The main `index.html` does not load this character. The original room videos and existing cat remain unchanged.
- Review controls: preen now, pause/resume, lamp, close-up, pose inspection and hide/show comparison. The bird follows lamp lighting and the camera, pauses during section navigation, and uses a resting pose for reduced motion.
- The generated atlas, source prompt, registration data, rendered captures and validation live in `qa/parrot/`. The larger cat reaction remains deferred: the original cat is baked into the video and needs a separately reviewed local replacement approach.
- Await the user's visual feedback before production integration or more animal artwork. Do not regenerate the room frame by frame.

## Parrot integration and local cat review — 22 October 2026

- The user approved the parrot prototype and requested it be added first. `parrot.js` and `assets/parrot/` now supply the same approved sprite/motion in the main studio. Its review page inspects the existing instance rather than adding another bird. The original room videos remain unchanged.
- The cat is explicitly a local review before approval/promotion. `qa/cat-review.html` tests a sleepy glance toward the lamp, a small inner-ear movement and a cheek press/slow blink while petting, at 8 FPS. It uses a tiny eye-expression reference plus original video pixels for motion, without painting the room or replacing the body/paws/tail. At rest the experiment clears its overlay and the original breathing video is shown.
- User review controls include the real lamp, Pet cat, Original cat comparison, close-up, pause and sequence/pose inspection. The existing opt-in purr remains attached to the same hotspot; repeated reactions are bounded. Reduced motion holds the original cat.
- The main studio does not load the cat experiment. Await the user's visual decision before integrating/pushing it to the live preview. Large head lifts and body movements are not part of this small local sample.

## Final animal approval and default sound — 22 October 2026

- The user accepted the cat reaction, including its small stretch, and requested finalization without more visual iteration. `cat.js` and `assets/cat/` now provide the approved 8 FPS lamp/petting reaction in the main studio. The inspection page reuses the same instance. Keep the original room/video/body/paw/tail pixels and original resting breathing behavior.
- Sound now defaults ON. Browser autoplay rules still require an actual interaction to start Web Audio; the first trusted click/touch/meaningful keypress unlocks it. Keep mute visible, remember explicit mute/on preferences, retain independent saved volumes, and cancel queued purrs when muted/hidden.
- A first pet may queue one brief purr while the local recording decodes; never stack it or play it after mute. No forced browser permission prompt or artificial user gesture is used.
- The user next requested deployment planning for frontend/backend/database. `DEPLOYMENT_PLAN.md` records the source-checked current state and proposed Vercel/Neon/file-storage setup. Do not confuse existing fixture adapters with an implemented admin CMS or connected database. This planning step does not authorize provisioning or a deployment.

## Backend stage remains separate

Vercel + Neon is the agreed direction. The current repositories prepare public content for that integration. Database persistence, admin authentication/authorization, media uploads and live email configuration are not yet provisioned. Administration must cover Projects, Journey, Resume, About, Notes and media/settings. Published-only access must be enforced by the eventual backend, not just hidden by client rendering.
