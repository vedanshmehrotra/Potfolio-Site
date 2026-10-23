# Journey, automatic lamp and repository presentation

23 October 2026. These application changes are verified in development. The owner asked to wait while GitHub Education reviews the Student Pack application; the existing production deployment and production CMS content were not changed in this pass.

## Changes

- Five career chapters: University, AirBorneHRS, Robotics Club / General Secretary, Think Computers, academic recognition. The owner confirmed Robotics Club precedes Think Computers. Unknown dates stay blank. AWS badges remain on the shelf; project-start pins were removed from Journey.
- Missing Journey photos use small code-authored pixel document symbols. Uploaded photos override them. The original baked room board, studio artwork, animal assets and three MP4s were not regenerated.
- The admin still accepts up to 100 milestones, six per board page. Additional records create pages without shrinking pins. Mobile titles use two compact lines; complete titles and stories remain available in the selected detail and accessible button name.
- After assets/CMS readiness, 3.5 seconds of visible room time triggers the original lamp activation clip. Section navigation and hidden documents pause the remaining time. Manual activation cancels automatic lighting for that visit; manual off is immediate and stays off. Reduced motion skips the clip. Localhost reference captures suppress the timer deliberately.
- GitHub description, homepage and topics were updated and read back successfully. The README now follows the owner's profile/PathForge style with actual screenshots, colored badges, concise features, architecture and setup. Detailed notes moved to `STUDIO_IMPLEMENTATION.md`.

## Executed checks

- Node unit tests: **11 passed**, including the five-record order, blank unconfirmed dates and the 100-record schema limit.
- Full Playwright suite: **103 passed, 1 failed** in the initial run. The bookshelf fixture's second page load did not reach readiness within seven seconds; its trace included localhost connection-refused messages. The fixture was changed to load its JavaScript from disk rather than make another intercepted HTTP request. The isolated bookshelf check then **passed**. No application guard or permission was weakened. This is not reported as a single clean 104-test run.
- The seven new Journey/lamp browser checks passed in that full run: readiness-relative timing, real clip playback, audio remaining locked until a gesture, manual cancellation, paused section/visibility time, deep links, reduced motion, mobile, keyboard selection, pagination, draft exclusion and photo fallback.
- Page Visibility policy was exercised with controlled document visibility events in headless Chrome; it was not a manual tab-switch test.
- Real development CMS integration: **passed** (`../cms/verification.json`). Included real owner login, denied anonymous reads/writes, private Blob upload, draft isolation, publishing, stale-edit/cross-origin rejection, a Journey record created through the actual editor, resulting public board/photo/story, and logout. Temporary records/uploads were restored/removed in cleanup. No production test data was written.
- Real CMS-to-browser capture: **passed** (`development-verification.json`), with Journey checks at 1440px, 390px and 320px, full board visibility, correct selection/order, reverse navigation/focus and no document overflow. No page errors or failed observed API/content/asset responses. The final measured lamp delay was **3502.1 ms after readiness**.
- Actual rendered desktop and 320px Journey screenshots, dark/lit room screenshots and transition samples were inspected. The first working prototype was shown before the mobile label adjustment. `development-automatic-lamp.webm` records the unclicked-page behavior.
- Original video hash assertions passed in the full browser run. Node syntax checks, deployment asset preparation and whitespace checks were executed. The static build prepared 17 runtime files plus public assets; this was a build check, not a deployment.

## Release and domain boundary

- `master` and `origin/master` both initially pointed at `b05ff60`; earlier approved CMS/audio/animals/content work had not yet been committed. The release commit includes that approved runtime work along with this pass.
- Vercel project inspection confirmed `gitConnected: false`. Pushing this repository does not trigger a Vercel release under that inspected configuration.
- `vedanshmehrotra.dev` was available as a non-premium name at the time of checking. Name.com's official Student Pack page includes standard `.dev` domains free for the first year; eligibility and checkout remain unverified while the owner's Education application is under review. No domain was registered, no renewal enabled, and DNS/auth origins were not changed.
- Environment files, credentials, local tool skills, caches, temporary maintenance files and duplicate raw recordings are excluded from the commit. `scripts/check-staged-secrets.cjs` scans staged bytes for provider token patterns, credentialed database URLs, private keys, JWT literals and exact known local credentials, reporting paths/rules without values. This is a bounded check, not a security audit.
