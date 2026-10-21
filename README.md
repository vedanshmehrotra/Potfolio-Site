# After Hours studio prototype

Run `npm run dev`, then open <http://127.0.0.1:4173/>. This folder originally contained the approved media and specification without an existing framework or website source. The implementation therefore uses HTML, CSS, JavaScript and the native Web Animations API.

## Interaction

- The room fills the viewport. Click the lamp shade to play `after_hours_transition_clean_2s.mp4`; its last frame hands off to the lit ambient loop. Lamp activation is independent of Projects. This version implements the requested one-way lamp activation; refresh starts in the dark room.
- Click the main monitor to enter Projects. Three illustrated pixel cards use the original artwork's mountain, cabin and campfire previews. Their original sample names are explicitly marked as preview data.
- Click the small green CRT beside the cat to enter About Me with the same smooth camera and pixel streaks. Back / Escape / browser Back returns to that monitor and preserves the room's lighting and framing. Portrait devices have an About Me shortcut when the CRT is outside the crop.
- Arrow keys and buttons select a card. Click a card to read its detail. Escape / Back returns detail → Projects → room, restoring monitor focus and lamp state.
- On portrait phones the wide studio fills the screen and can be dragged sideways. A Projects fallback button is provided. Inside Projects, swipe through the enlarged pixel cards.
- Query deep links such as `/?project=pixeljournal-preview` work on refresh. `?view=projects` opens the selector.
- `?view=about` opens the profile directly and works on refresh.
- The pinned board opens Journey (`?view=journey`): hover, focus, or tap a photo to read its milestone. Six pins per page keep the complete board visible; more published milestones create additional pages. The red thread follows their sort order. Room artwork stays baked and unchanged.
- The open journal left of the monitor opens Resume (`?view=resume`). Select a chapter to read the pixel typeset version. Its download control sits at the top right. The PDF URL is independent of the chapter content. The attached CV is not copied into public assets while its public contact details are undecided.
- The phone beside the journal opens Contact (`?view=contact`). Name and reply email are optional; message is required. Drafts survive navigation within the page, failures retain the text, and success is shown only after a successful backend response. Refresh clears the in-memory draft. The contact interface exposes no phone number or recipient email.
- All three use the approved smooth camera and shared rush effect. Each has portrait shortcuts, keyboard entry, Escape / Back / browser history, and reduced-motion behavior.
- Projects detail has compact Overview, Engineering, Evidence, and Stack & links file navigation. About stays personal, with the GitHub and LinkedIn URLs supplied in the CV.
- The left bookshelf opens Reading & notes (`?view=bookshelf`), a small collection with selectable published entries and optional source links. Its placeholder content can be replaced independently of the room artwork.
- Reduced motion pauses ambient playback, skips the lamp clip and camera rush, and retains keyboard navigation.

## Shared content and assets

`projects.js` defines the JSDoc Project model and one `projectRepository.listPublished()` service. Both monitor and expanded views use `screenMarkup()` against the same published records. Replace the fixture repository with a CMS/API adapter; no admin backend or credentials are included.

`about.js` contains the editable starter profile and an `aboutRepository.getPublished()` boundary. Its copy uses the supplied AI/ML undergraduate background and has no invented contact details or credentials. The green monitor and destination use the same record and markup. Drafts remain hidden; missing and failed content have explicit states. Desktop content uses a 528 × 432 layout displayed at one quarter size within the native 132 × 108 screen, then enlarged by the same camera. Phones reflow the content into a scrollable page.

The approved MP4 files were not changed. `assets/studio-dark.png` and `assets/studio-lit.png` are byte copies of frames 000 and 016 from the supplied ZIP. The preview covers are SVG viewports onto that image, not generated or repainted artwork. The locally served [Tiny5 font](https://github.com/google/fonts/tree/af92066a6e6eb75cec7833820f6e71b828467881/ofl/tiny5) is distributed with its original OFL license.

The world uses one native 1672 × 942 coordinate system. The Projects rectangle is x=544, y=322, width=568, height=268. The About Me rectangle is x=1165, y=493, width=132, height=108. Camera maps and clipping are calculated from the active screen and viewport dimensions. A current-frame canvas snapshot avoids video decoding during the rush. Native pixel artwork and type preserve the pixel direction.

## New section content and backend boundary

`content.js` supplies `journeyRepository.listPublished()`, `resumeRepository.getPublished()`, `notesRepository.listPublished()`, and `contactRepository.send()`. `sections.js` renders the physical-object destinations; it declares their source-coordinate rectangles once. Journey, resume and notes exclude drafts and have missing/error states. Photos are referenced by URL and alt text. Journey uses stable IDs, sort order, results and descriptions; its strings follow chronological sort order. The room board, journal, phone and bookshelf have no live content overlays.

The read adapters are fixtures ready to replace with authenticated API-backed administration and Neon persistence. No database, upload service, or admin login has been provisioned. Future administration covers all sections, media and publishing, not only Journey. About has no resume or Journey tabs.

`api/contact.js` is an optional Vercel Node function using the [Resend HTTP API](https://resend.com/docs/api-reference/emails/send-email), with no SDK dependency. It validates message fields and request size, rejects the honeypot, checks the configured origin, and accepts only the server-configured recipient. `.env.example` lists server-only settings. Delivery defaults to disabled. Configure a verified sender, recipient, API key, allowed origin and platform rate limit before setting `CONTACT_ENABLED=true`. Origin validation and the honeypot alone are not sufficient abuse controls. No real emails were sent during development.

The Python static development server does not execute Vercel functions; sending there returns an honest unconfigured/error state. The browser tests exercise success and failure with controlled HTTP responses. API tests replace the provider transport and validate requests without using credentials. Real email delivery and deployment remain unverified.

`qa/sections-review.html` contains desktop/mobile screenshots, sampled entrance/return frames, and the browser recording for Journey, Resume, Contact and Notes. Refresh these with `node scripts/capture-sections.cjs` while the dev server runs. The objects deliberately transition from baked room pixels to readable interactive views; no seamless artwork match is claimed.

## Camera and rush effect

The selected A camera is now the only entrance: continuous movement with a brief approach, acceleration and a gentle landing. Entrance duration remains 560 ms on desktop and 420 ms on phones. The return is unchanged. The stepped B camera has been removed; old camera query parameters no longer select a different animation.

Six tapered pixel streaks (four on phones) travel outward from the projected monitor centre during the fast section, then fade before landing. The shared effect uses longer, thicker warm-white/cyan strokes and holds its peak brightness for about 110 ms on desktop / 84 ms on phones so it registers during a normal viewing. They remain at the edges, with no extra particles or landing flash. Their geometry is calculated once per entrance; the browser animates transforms and opacity. Reduced motion skips the camera and streaks together.

The former `/qa/camera-comparison.html` URL redirects to the selected studio. `?reference=1` is a localhost-only screenshot aid that freezes the approved first frame; normal navigation still captures the current live video frame.

## Validation and review

Run `npm install`, then `npm test`. Playwright is the only development dependency. Tests use the installed Google Chrome browser (`channel: chrome`). The test server uses Python. No frontend build step is needed.

`qa/review.html` shows the current smooth camera's browser recording and screenshots. Run `node scripts/capture-review.cjs` while the dev server is running to refresh `qa/smooth-rush-review.webm`.

`qa/about-review.html` shows the About Me entrance and return in dark and lit rooms, plus desktop, tablet and phone screenshots. Refresh its recording with `node scripts/capture-about.cjs`.

`qa/effect-review.html` compares the earlier and updated streak strength at matching Projects animation times, with desktop and phone frames and links to both current recordings.

Checks cover unchanged asset hashes, actual lighting playback, three shared cards, keyboard focus, Escape and browser history, deep-link refresh, empty/error/draft data, duplicate clicks, navigation and resizing during entry, reduced motion, and a native touch swipe. Camera checks sample rendered transforms, outward streak movement, edge placement and disappearance before landing. Screenshots cover 1440×900, 1920×1080, 768×1024 and 390×844, plus DPR 1.25 and 2. These DPR checks do not represent manually changing Chrome's toolbar zoom to 125%.

`qa/camera-timing.json` contains browser requestAnimationFrame samples. Screenshot runs deliberately pause the animation; only the final uninterrupted entry is appropriate for timing interpretation. Measurements describe this test host and browser, not a low-end device benchmark. The rendered frames and recording are provided for visual review; pixel perfection and a seamless handoff are not claimed.

For local calibration, open `/?calibrate=1`. The outlines are disabled by default and unavailable on non-local hostnames. `?qa=1` exposes timing data only on localhost.
