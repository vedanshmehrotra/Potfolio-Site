# Original static production deployment verification

Historical record. The current database/CMS release is documented in `CMS_DEPLOYMENT_VERIFICATION.md`. Shared `verification.json` and screenshot filenames are refreshed by subsequent live checks; they now describe the latest release.

22 October 2026. Public site: https://after-hours-portfolio-virid.vercel.app/

## Deploy result

- **Target:** production; **status:** READY, confirmed by Vercel CLI inspection.
- **Project:** `vedansh-mehrotras-projects/after-hours-portfolio`.
- **Project ID:** `prj_Xr2idjNer28g2kMEWhB2msNaGteq`.
- **Deployment ID:** `dpl_Fxid3Uv2Nwu9rfiYTXaHC252pdzx`.
- **Deployment URL:** https://after-hours-portfolio-u76qwjxhb-vedansh-mehrotras-projects.vercel.app/
- **Source:** local working tree based on Git HEAD `b05ff60`, including uncommitted/untracked approved work. No commit, push, Git integration or automatic deployment was created.
- **Framework:** static HTML/CSS/native JavaScript, plus Vercel Node function `api/contact` in `iad1`.
- **Build:** custom static packaging command succeeded; original artwork was copied without regeneration. Build logs recorded build start at 11:18:08 UTC and completion/deployment at 11:18:16 UTC, about eight seconds. The npm `cache-dir` warning did not prevent the build.
- The older Vite `potfolio-website` project and its aliases were not modified.

## Executed live browser checks

`DEPLOYMENT_URL=https://after-hours-portfolio-virid.vercel.app node scripts/verify-deployment.cjs` completed successfully using installed Google Chrome through Playwright. `verification.json` contains the final results: **passed=true**, **pageErrors=[]**, **failedRequests=[]**.

Verified without Vercel login cookies or localhost diagnostic hooks:

1. Public page loads, cat and parrot initialize, sound starts enabled and QA globals are unavailable.
2. Three original MP4s, both animal artwork assets, rain, purr and approved CV match the local SHA-256 bytes exactly.
3. `/.env`, `/qa/cat-review.html`, `/scripts/prepare-deployment.cjs` and `/package.json` return 404. `/api/contact.js` executes the Node function and returns its expected JSON 405 response; it does not expose source.
4. A trusted click fetches the rain recording. Lamp turns on and off. All six sections open and return, keyboard focus is restored, and the CV downloads with its intended filename.
5. Desktop carousel selection is shared with the miniature monitor; a project opens, its Engineering tab renders and returning preserves selection.
6. Projects deep link survives refresh and returns to the room.
7. At 390×844 with touch and reduced motion, all six sections open and return, carousel selection changes, and the selected card is visible. No document-width overflow was detected.
8. Empty Contact submission shows the application's error without a request. A valid draft receives the expected disabled-delivery HTTP 503 and remains intact. GET returns 405 with Allow: POST; malformed content returns 400. No email was sent.

The initial smoke run stopped at an incorrect assertion that `/api/contact.js` must return 404. Direct inspection confirmed that Vercel routes it to the executable function, returning JSON `{ok:false,error:'Use POST to send a message.'}` with HTTP 405. The test now checks that response and content type. `verification-initial.json` preserves the failed result. No application change was needed. Subsequent live runs passed, including the extended carousel checks.

## Visual evidence

Desktop room, expanded Projects and mobile Projects/Contact screenshots were visually inspected. The first mobile Projects screenshot caught Chrome's brief native tap highlight at the earlier button position; final screenshots wait 350 ms for it to fade. No room artwork or interaction code was modified for deployment.

- `desktop-room.png`, `desktop-projects.png`, `desktop-about.png`.
- `desktop-journey.png`, `desktop-resume.png`, `desktop-contact.png`, `desktop-bookshelf.png`.
- `mobile-room.png` and corresponding `mobile-*.png` for each section.

These checks verify rendered screens and public workflows. They do not claim a new seamless animation, a hardware listening test, a low-end-device benchmark or a complete historical runtime-log scan.

## Runtime observation and remaining scope

Vercel CLI runtime-log streaming was observed while checks ran and emitted no application log entries. Chrome reported no page errors or failed requests in the final checks. Monitoring/drains were not configured in this task, and no broad historical production-error scan was performed.

The frontend and prepared Contact endpoint are deployed. Content remains fixture-backed; Neon, file storage, admin authentication/dashboard, content writes/uploads and live Resend delivery have not been provisioned or verified. Future work remains described in `../../DEPLOYMENT_PLAN.md`.
