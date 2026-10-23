# CMS implementation verification

22 October 2026. This record distinguishes actual database/storage checks, controlled mail tests and live public workflows.

## Implemented scope

Native owner dashboard for all five content sections; Better Auth owner sessions with public signup disabled; Postgres drafts/publication snapshots and revision conflicts; private Blob uploads with publication-based access; shared public API for miniature/expanded content; durable Contact limits, duplicate protection and Resend transport. Production and development resources are separate. The approved artwork and ambient media were preserved.

## Executed checks

### Unit validation

`node --test tests/cms-validation.test.cjs`: **5 passed**. Checks approved fixture schemas, draft exclusion, duplicate IDs/slugs, unsafe URLs, media reference deduplication and accepted file signatures.

### Real development CMS integration

`node --env-file=.env.local scripts/verify-cms.cjs`: **passed**. `verification.json` records the results with `errors=[]`. This uses real isolated development Neon/Blob services and a real Chrome owner session.

- Anonymous admin reads/writes, draft reads and uploads are denied; public signup returns 404.
- Owner login and all five editor tabs work.
- Saved private drafts persist without changing public data; stale revisions return 409 and foreign-origin writes return 403.
- Upload through the browser file chooser succeeds. Owner reads return the exact uploaded bytes; anonymous reads return 404 before publication.
- Publishing exposes referenced media and excludes draft records. The miniature monitor and expanded Projects use the same published record.
- Nested Resume chapter/entry text persists.
- Unpublishing removes public content and media access while retaining the draft; republishing works.
- Refresh persistence, 390px owner layout and logout revocation are checked.
- The script restores original development snapshots/references and removes test uploads. A single upload left by an intermediate failed run was separately identified as development-only/unreferenced and removed from that database and Blob store.

An intermediate run failed because Chrome's inspector evicted a response body. The test now waits for the actual upload response/status and reads the resulting URL from the form. The final successful run did not weaken privacy or byte assertions. `projects-desktop.png`, `projects-mobile.png` and `login-desktop.png` were visually inspected; temporary development titles in those captures are test data, not published production edits.

### Contact persistence with controlled delivery

`node --env-file=.env.local scripts/verify-contact-storage.cjs`: **passed**, recorded in `contact-storage.json`.

Uses real development Postgres with a controlled provider transport. Verified sent-state persistence, one transport call for duplicates, server-only recipient, visitor Reply-To, stored failures/retry with the same idempotency key and durable per-client 429. Test records are cleaned up. **No real email was sent by this script.**

### Existing browser regression suite

The full Playwright run executed 98 cases: **96 passed, 2 failed** (`regression-tests.json`). Both failed cases passed targeted reruns (`regression-reruns.json`):

1. A Resume fixture depended on `route.fetch` to a local Python server and encountered `ECONNREFUSED`. The fixture now reads the same checked-out source file directly. Behavior assertions remain unchanged.
2. The camera diagnostic attempted a shared Windows QA-file write and encountered an `UNKNOWN` filesystem error. It now uses the test's unique output path. Rendered geometry/timing assertions remain unchanged.

All 98 distinct cases therefore have passing results across the main run and targeted reruns; there was not one clean full 98-case run. The unchanged MP4 hash checks passed. After the final Contact status copy adjustment, five Contact/inline-validation cases passed (`contact-final-focused.json`).

### Deployment checks

The first CMS build failed `npm ci` because the lockfile did not satisfy Better Auth's `jose` peer requirement. Explicit root `jose@6.2.13` resolved it while Vercel's OIDC dependency retained its compatible nested `jose@5.10.0`. Later production installs/builds succeeded, with zero reported npm audit vulnerabilities. No frozen-lockfile checks were bypassed.

The initial CMS deployment `dpl_HjPrGoax3xY71VGgA3vGdeewUZVo` was READY and promoted to the public canonical URL. The subsequent mail/auth-route correction is deployed as `dpl_AwLDjo4gRgQR2ar9u3hoEeipUK4w`. See `../deployment/CMS_DEPLOYMENT_VERIFICATION.md` for executed live checks.

The initial live attempt timed out waiting for the browser's complete load event (`live-initial.json`). The second passed desktop/API/media checks but hit an overly short 5-second mobile app-ready wait (`live-mobile-wait-initial.json`). The final script waits for DOM content and actual app readiness with the same 30-second allowance on both viewports. The final run passed, with no browser page errors or failed requests. Fresh mobile readiness took 24,560ms on this run; this is a measured delay and is not a claim of fast first load.

## Email and owner reset follow-up

The owner saved `RESEND_API_KEY` privately as a Production secret. During staging, inspection found two reset-link issues: the allowlist omitted Better Auth's token callback, and the framework-free Vercel filesystem route did not dispatch the longer callback URL. The handler now allows that exact GET route and `vercel.json` explicitly rewrites nested auth paths to one `api/auth.js` function. A staged invalid-token request now returns the expected 302 to the canonical reset form. No public signup route was enabled.

`node --env-file=.env.local scripts/verify-owner-reset.cjs` passed against real isolated development auth (`owner-reset.json`). It checks a valid private token through both direct and rewritten callbacks, URL-token removal, rejected foreign callback origins, short/mismatched passwords, actual one-time reset, old-session revocation, login and logout. It sends no email. An initial test-cleanup call used the wrong library method and was corrected. Repeated runs then hit the configured login limit; a status-only diagnostic confirmed 429. The failed run is retained in `owner-reset-rate-limited.json`. A rerun after the normal cooldown passed without changing the rate limit.

Five unit checks and Node syntax checks passed again. `git diff --check` passed with Windows line-ending warnings only.

Production evidence:

- `production-reset-request.json`: the actual dashboard button made a successful reset-email request. No token, email body or password was accessed by the agent. The owner then confirmed **Signed in successfully**.
- `production-contact-api.json`: one real Contact test returned HTTP 200 and `ok:true`.
- `production-mail-storage.json`: that test is persisted as sent with a provider ID present; the ID and message body were not exported. The owner confirmed **Received it** in Gmail.
- Further browser submissions of that identical test use the existing duplicate protection rather than producing additional emails.

The initial email-enabled full smoke hit a five-second animal-readiness wait; explicit 30-second asset readiness was added without changing application code. A subsequent run completed desktop, public API, privacy, reset callback and unchanged-media checks, then stopped at the mobile Projects selector after slow startup (`live-resend-mobile-projects-initial.json`). Separate direct Contact diagnostics retained in `live-contact-navigation-wait-initial.json` encountered a 30-second DOM navigation wait. These are not reported as a clean full smoke pass.

The final focused mobile form check (`scripts/verify-live-contact.cjs`) waits for the actual Contact interface after the navigation commits. It passed: real submit returned HTTP 200, the UI showed success and cleared the draft, returning to the room and entering Projects rendered all three cards, and no page errors occurred (`production-mail-browser.json`). The identical test message was deduplicated, so this did not send another email. `production-contact-sent.png` was inspected. First Contact readiness took 50,310ms in this fresh browser context; that slow cold load is a remaining performance observation, not a resolved issue. A direct public content read returned HTTP 200 and three projects in 437ms.

## Remaining validation and limits

- Actual inbox delivery and production owner sign-in were confirmed by the human owner. Production edit/upload/publish operations were not performed by the agent; those workflows were exercised against real development services.
- Media exports include metadata, not file binaries. There is no dashboard media-cleanup, backup-import or messages-inbox interface in this release.
- Live public screenshots verify the retained visual theme. No new seamless-animation, physical-speaker, low-end-device or unrestricted email-delivery claim is made.
