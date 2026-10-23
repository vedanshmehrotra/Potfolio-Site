# Project presentation and credential refresh

22–23 October 2026. Continues the owner's approved content work on the existing studio.

## Changes

- Four distinct project covers, authored as SVG pixel geometry in the existing palette. Both monitor sizes still render the same CMS project records. No studio image, animal sprite, MP4 or camera geometry was edited.
- Short project introductions and three highlights; a four-step process plus three engineering notes; a captioned picture viewer with arrows, thumbnails and full-size links; locally served Devicon technology marks.
- Four PathForge images (one landing-page screenshot, three existing product-tour screenshots), the owner's ResolveFlow audit screenshot plus two interface previews, one PlanEase interface preview, and a CI/CD architecture sketch plus two original internship slides. Previews use explicit sample data and are labelled in the picture/caption; they are not presented as live backend verification. See `project-picture-sources.json`, `presentation/attachment-sources.json` and `../../content/CONTENT_SOURCES.md`.
- The optional structured project fields are validated and owner-editable through the existing JSONB CMS. Existing projects without those fields still render. No SQL migration, framework or runtime dependency was added.
- Curiosities now uses two questions connected to the owner's work. Beyond the code includes the CV's top-10 cohort CGPA achievement. The downloadable CV is unchanged.
- Added the seventh public credential: Sustainable Development: The Post-Capitalist Order, SDGAcademyX through edX, issued 16 January 2025. The actual certificate page named the owner and supplied the date and credential ID. `edx-source.json` records the check. Four other unconfirmed course entries remain private drafts.

## Executed checks

- Unit validation: **10 passed** (`npm run test:unit`), including optional project-field round trips, size limits, the four project covers and seven public credentials.
- Existing focused browser regression: **35 passed in one run** (`presentation/regression.json`). Sections, object feedback and studio tests cover keyboard/history navigation, the supplied lamp clip and ambient preservation, mobile panning/swiping, reduced motion, original video hashes and case-study navigation. These use controlled frontend fixtures; they are separate from real database checks.
- Real development presentation: **passed**, `presentation/development-verification.json`. Every project, highlight/process/decision count, gallery selection/wraparound/focus, icon load, reverse navigation, About fit, resume achievement and edX link passed. 390px and 320px project-file sections and touch galleries had no content-panel overflow. No page errors or failed project/icon asset responses.
- During development of the new verification script, two assertions were corrected: image URLs are normalized to absolute URLs by the existing renderer, and `.is-selected` also matched a pagination dot. Application behavior was not changed to satisfy those assertions. A later complete presentation run passed.
- The first real CMS integration attempt passed structured editing, private uploads, publication and access checks, then hit its old five-second studio-startup assertion while the independent frontend regression was running. That failed report is retained as `presentation/cms-initial.json`. The targeted startup wait was changed to a measured 30-second bound to cover the existing 15-second content request timeout; content and permission assertions were retained. The separate rerun **passed**, `../cms/verification.json`: startup 4207ms, CMS read HTTP 200 in 3885ms, no page errors. Temporary edits and uploads were restored/removed.
- Original MP4 SHA-256 values matched `../asset-hashes.json`. Node syntax and whitespace checks were executed during implementation.

## Visual review

The first working cover prototype was shown in chat and linked locally before further adjustments. Development cover, overview, process, stack, 320px gallery and original interface-preview captures were inspected. The screenshot viewer was enlarged after the first overview capture. The Next.js icon's contrast rule was corrected to preserve its letter instead of making the mark a solid disc.

Final production covers, the ResolveFlow gallery, the original internship slide inside the gallery, the 320px viewer and the edX credential were also visually inspected (`presentation/production-*.png`).

## Production release and live checks

- Released 23 October 2026 to https://after-hours-portfolio-virid.vercel.app/.
- Deployment: `dpl_LbTPq1JYaVaYcrFgGvzFz5En4XbH`, https://after-hours-portfolio-3lc29l6tl-vedansh-mehrotras-projects.vercel.app/. Vercel reported READY. The staged JavaScript and an original internship slide were fetched using existing Vercel authentication and matched the local bytes before promotion.
- Promoted that exact deployment. The reviewed bundle was then published atomically to the production CMS. The importer confirmed the previous draft/public content still matched the reviewed baseline and preserved a private backup, `production-before-1792726542257.json`. No intervening owner edits were overwritten.
- `DEPLOYMENT_URL=https://after-hours-portfolio-virid.vercel.app node scripts/verify-project-presentation.cjs`: **passed**, `presentation/production-verification.json`. All four project files, every gallery image/full-size URL, gallery controls/wraparound/focus, technology icons, reverse navigation, revised Curiosities fit, resume achievement and seventh credential passed. Touch checks at 390px and 320px passed without content-panel overflow. No page errors or failed project/icon asset responses.
- `presentation/production-import.json`, `presentation/development-import.json` and `presentation/cms-verification.json` preserve the relevant import/integration reports for this release.
- The first staging attempt on 22 October was not executed: automatic approval review could not complete because of its usage limit. The later retry went through the normal approval process successfully; no alternate path was used to bypass that failure.
- No Contact email was sent by these presentation checks. No Git commit, branch or push was created; HEAD remains `b05ff60ff0ca9d60f874b8f7dbcaf0e439b8fe22`. Original animation hashes, final Node syntax and whitespace checks passed.

## Main changed files

- UI: `app.js`, `sections.css`, `projects.js`.
- CMS: `server/content.cjs`, `admin/admin.js`, `content/portfolio.cjs`, guarded content importer.
- Media: four cover SVGs, project screenshots/slide images/diagram and local technology icons with their license.
- Validation: portfolio unit tests, the existing case-study navigation assertion, real CMS verification and the new presentation verification script. Source/operation notes are in `content/CONTENT_SOURCES.md`, `README.md` and `CMS_SETUP.md`.
