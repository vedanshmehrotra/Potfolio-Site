# Database and owner-dashboard deployment

Historical CMS/email integration record. The subsequent portfolio-content and credential-shelf release is documented in `../content/CONTENT_VERIFICATION.md`.

22 October 2026. Public studio: https://after-hours-portfolio-virid.vercel.app/. Owner interface: https://after-hours-portfolio-virid.vercel.app/admin.

## Release

- Project: `vedansh-mehrotras-projects/after-hours-portfolio`.
- Email/auth deployment ID: `dpl_AwLDjo4gRgQR2ar9u3hoEeipUK4w`.
- Deployment URL: https://after-hours-portfolio-fahhit3xo-vedansh-mehrotras-projects.vercel.app/.
- Vercel reported READY; this exact staged deployment was promoted. Inspecting the canonical short URL resolved to this deployment ID.
- Source was the existing local working tree. No Git commit, push or branch was created.
- Five Node functions in `iad1`: admin, auth, contact, content and media. The website remains HTML/CSS/native JavaScript.
- Separate free production/development Neon databases and private Blob stores are connected to the appropriate environments. Auth/content schemas and original content seeds are provisioned.
- Production owner completed the private email password setup and confirmed successful sign-in. Passwords and reset links were not shared with the agent.
- Resend is configured as a Production secret. The Contact test was accepted and recorded as sent; the owner confirmed actual Gmail arrival.

## Live browser/API result

The initial database/CMS release completed the full `scripts/verify-deployment.cjs` smoke with **passed=true**, **pageErrors=[]**, **failedRequests=[]**. Its report is archived in `../cms/live-before-resend.json`.

For the email/auth-route correction, the latest full smoke completed the desktop/API/media/reset/deep-link checks below, then stopped at the mobile Projects Next selector after slow startup. `verification.json` and `../cms/live-resend-mobile-projects-initial.json` retain that **passed=false** result. No page errors or failed desktop requests were reported. A separate focused mobile Contact/Projects-entry check passed, as detailed below. These results are not described as a clean complete rerun.

The earlier complete public production check included:

1. Studio readiness, both animals, sound enabled by default and unavailable localhost diagnostic globals.
2. Database-backed public API reports all five sections; anonymous draft/admin reads return 401. Auth health returns 200 and public signup is denied.
3. Original videos, animal artwork, rain/purr recordings and CV match local SHA-256 bytes.
4. Environment, database, server, QA and packaging routes are not publicly served. `/api/contact.js` executes the function rather than returning source.
5. Trusted-gesture audio fetch, lamp on/off, all six section entries, reverse navigation/focus, shared carousel selection, project case-study tabs and real CV download.
6. Projects deep link and refresh.
7. At 390px with touch/reduced motion, all sections navigate, carousel selection stays visible and the document does not overflow horizontally. This was the earlier database release; the latest full run stopped at this mobile stage.
8. Empty Contact validation makes no request. Before credentials were configured, a valid message received the expected 503 and retained its draft. GET/invalid requests returned the expected 405/400. Actual enabled-delivery evidence follows below.

The earlier complete run's fresh mobile app-ready time was **24,560ms**. The later failed full run measured **39,159ms**. These include network/browser/media startup and do not isolate a cause. Previous failed readiness waits are retained in `../cms/live-initial.json` and `../cms/live-mobile-wait-initial.json`.

## Actual email and reset verification

- Vercel CLI confirmed `RESEND_API_KEY` is a Production Secret without reading its value. The corrected deployment was staged, checked, promoted and confirmed through inspection of the canonical public URL.
- The initial file-based auth route returned a platform 404 for the longer reset callback. The explicit rewrite to `api/auth.js` now dispatches it correctly; the staged invalid-token callback returned 302 to the canonical reset form. The handler allows the library's GET callback while continuing to deny public signup and require same-origin POSTs.
- The live dashboard's **FIRST LOGIN / RESET PASSWORD** button returned HTTP 200. The owner received the private link, set their own password and confirmed **Signed in successfully**. No reset token/password was accessed by the agent.
- One real Contact API test returned HTTP 200 / `ok:true`. The private database records it as sent with a provider ID present. The owner confirmed **Received it** in Gmail. Status-only evidence is in `../cms/production-contact-api.json` and `../cms/production-mail-storage.json`.
- `node scripts/verify-live-contact.cjs` passed in a fresh 390px touch/reduced-motion Chrome context (`../cms/production-mail-browser.json`). It submitted through the real form, observed HTTP 200, confirmed the success message and cleared draft, returned to the room and opened Projects with all three cards. The identical message was suppressed as a duplicate by the backend, so the browser repeat did not send an additional email.
- That focused run measured **50,310ms** from navigation start to Contact readiness. The CMS response event occurred at 50,153ms from navigation start; this is not a measurement of the API request duration. A separate direct public API read returned all three projects in **437ms**. Cold browser startup remains slow in this test environment and is not presented as resolved.

## Visual evidence and remaining steps

`desktop-projects.png` and `mobile-contact.png` from the earlier complete live run were inspected, alongside the development owner dashboard's desktop/mobile screenshots. The final enabled-send screen `../cms/production-contact-sent.png` was also inspected. The existing retro theme, cards and Contact form remain intact. Other `desktop-*.png` and `mobile-*.png` files capture each destination.

The human owner confirmed authenticated production login. Production content editing was not performed by the agent. Real development owner login, private uploads, draft persistence, publishing, unpublishing and the corrected reset flow were checked separately; see `../cms/CMS_VERIFICATION.md`.

Resend's initial own-inbox sender is restricted to the email associated with its account; a verified domain is needed for other recipients. The latest full mobile regression run remains incomplete after the slow startup described above; the focused mobile Contact and Projects-entry check passed.
