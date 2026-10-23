# Portfolio content and credential-shelf verification

This records the initial content release. The subsequent project presentation and seventh credential are recorded in `PRESENTATION_VERIFICATION.md`. Flat JSON report names are rolling reports; the subsequent release preserves its own copies under `presentation/`.

22 October 2026. Public studio: https://after-hours-portfolio-virid.vercel.app/.

## Delivered content

- Exactly four owner-selected projects, in order: PathForge, ResolveFlow, Automated CI/CD Framework, PlanEase. PathForge links to the existing `PathForge-v2` repository and uses its current FastAPI stack. Unsupported metrics and PlanEase's uncorroborated real-time claim were omitted.
- Personal About copy focused on backend/cloud work and applied AI; the compact text fits the existing green CRT. Robotics remains the personal context supplied by the owner/CV.
- Six Journey milestones: university, AirBorneHRS, Think Computers, AWS training, PathForge and Robotics Club. Dates not supplied were left blank.
- Resume chapters populated from the existing CV and corroborated project sources. The approved PDF download remains unchanged.
- Bookshelf becomes Certifications & learning, retaining `?view=bookshelf` and the internal `notes` key. Entry type, issuer, completion date, credential ID, badge image, verification link and optional certificate PDF are editable through the owner desk.
- Six public AWS Educate training badges. Every Credly page returned HTTP 200, named the owner and supplied the expected title. Month-level dates come from the owner's GitHub credential index. Five other CV-listed course entries remain private drafts. The additional LinkedIn credential still needs its link/details; the connected tab showed an authentication wall.

Sources and editorial boundaries are in `../../content/CONTENT_SOURCES.md`. No room artwork was generated or replaced. Badge files and the PathForge gallery screenshot are unchanged copies of existing public artwork/screenshots.

## Executed development checks

- `npm run test:unit`: **9 passed**, covering original schemas, the four-project import, credential validation, unsafe URLs, private course exclusion and media-reference permissions.
- `node scripts/verify-portfolio-content.cjs`: **passed**, `development-verification.json`, no page errors. Real development CMS reads, all four project files/tabs, fourth-project pagination and wraparound, shared miniature selection, About fit, Journey selection, Resume chapters/PDF, six credential images and verification links, keyboard focus/return and touch at 390px/320px.
- `node --env-file=.env.local scripts/verify-cms.cjs`: **passed**, `../cms/verification.json`, no page errors. Real isolated owner login/editing, private Blob upload, publication/unpublication, access denial, revision conflicts and credential type/issuer/date persistence. Temporary development edits and uploads were restored/removed.
- Existing section/interaction regression run: **23 passed, 1 failed** out of 24 (`regression-focused.json`). The new long shelf caption measured 208.75px, violating the existing compact-tooltip limit. The caption was shortened to `Certifications`; the unchanged size test then passed (`tooltip-rerun.json`). All 24 distinct cases have passing results across the run and rerun; this is not described as one clean 24-case run.
- Original MP4 SHA-256 checks passed. Node syntax and `git diff --check` passed.

## Visual review

Development screenshots were inspected for the Projects selector, green CRT, certification shelf and 320px metadata. The first About draft clipped its footer; the copy was shortened and a footer-within-screen assertion added. Mobile credential metadata was changed from narrow columns to stacked fields. Long project titles use two lines, and official badge images are framed without their excess social-preview padding. Original image files were not edited.

`development-*.png` show the reviewed screens. Initial About/mobile captures are retained with `-initial` suffixes. The local real-data prototype was opened before these focused adjustments.

## Production release

- Staged deployment: `dpl_EhrHojNhTPEgtNbbMLhV8wFwCano`.
- URL: https://after-hours-portfolio-ray5tp9cw-vedansh-mehrotras-projects.vercel.app/.
- Vercel reported READY. Staged credential code and badge delivery were checked before promotion.
- The exact deployment was promoted to the canonical public URL. The validated content was then imported in one production transaction, preserving a local backup. The importer confirmed the existing drafts/public snapshots were still the initial placeholders before replacing them.
- `production-import.json` records four public projects, six public Journey milestones, updated About/Resume, and six public credentials out of eleven saved records. Backups matching `*-before-*.json` are Git-ignored; no credentials, auth sessions or Contact records were modified.
- No Git commit, push or branch was created.

## Executed production checks

- `DEPLOYMENT_URL=https://after-hours-portfolio-virid.vercel.app node scripts/verify-portfolio-content.cjs`: **passed**, `production-verification.json`, no page errors. The canonical public site returned the four requested projects, six public badges and populated About/Resume content from the real CMS API.
- All four project files/tabs, pagination, miniature selection, wraparound and reverse navigation passed. About fit, six Journey milestones, Resume chapters/download, credential images/metadata/verification links and keyboard focus passed.
- Touch workflows at 390px and 320px reached the fourth project and credential details without document overflow, and returned to the studio. Measured readiness was 11.248s and 12.230s respectively in this run; this is a recorded observation, not a startup-performance improvement claim. The three measured CMS reads returned HTTP 200 in 316ms, 831ms and 1133ms.
- Final production Projects, About, credential shelf and 320px credential screenshots were visually inspected. Full long project titles, the About footer, issuer details and verification links were readable in the reviewed captures (`production-*.png`).
- This content verification sent no Contact email and did not repeat the earlier release's email-delivery test. No new full-suite regression run is claimed.
