# Portfolio content sources

Prepared 22 October 2026. This is an import/review record, not an automatic replacement for subsequent dashboard edits.

## Confirmed selection

The owner requested these four projects in this order: PathForge (repository `PathForge-v2`), ResolveFlow, Automated CI/CD Framework, PlanEase.

## Sources used

- Supplied CV: `assets/Vedansh-Mehrotra-CV.pdf`. Education, two internships, AWS delivery work, robotics role and course names. The downloadable PDF remains unchanged.
- https://github.com/vedanshmehrotra/PathForge-v2 at `94b3c8adf2d411d81a9611ab45c359bd5723554a`: README, public product screenshots. Local Procfile and frontend manifest confirm the active FastAPI/Next.js stack; the older CV/profile Flask label is not used for the current project.
- https://github.com/vedanshmehrotra/ResolveFlow at `f382659255599c30f963b3e8d7e057c5ce31314c`: README; local `web/app.py` and `web/model.py` corroborate intake, confidence routing, human override, assignment and model integration.
- https://github.com/vedanshmehrotra/PlanEase at `7dc20ef222704f91929982e64aba345aa93dd29a`: README and task/note routes plus Task model corroborate JWT identity, account-scoped queries, persistence and CRUD fields. README's real-time claim is not repeated without supporting implementation evidence.
- `D:/Internship Final Project/demo-app/deploy.yml` and `app.py`: commit-tagged images, ECR/EC2 deployment, version and database health checks. The CV and public profile describe the wider stable-version rollback framework. No public repository URL was found, so its project link is blank.
- https://github.com/vedanshmehrotra/vedanshmehrotra/blob/main/assets/credentials.md at `c7c7933b6acac0ba4e55e0aa4a0c7bf53373437a`: six AWS Educate badge URLs and May 2026 issue month. Every linked public Credly page returned HTTP 200, named Vedansh Mehrotra and supplied the expected badge title. See `qa/content/credential-sources.json` for title/holder checks and official image URLs.
- https://www.linkedin.com/in/vedansh-mehrotra-05b41331b/details/certifications/ was readable in the signed-in browser on 22 October 2026. It listed the additional edX course and its public verification link. That link was also supplied directly by the owner. The actual certificate page, https://courses.edx.org/certificates/7ceeabda2ff14749b8694c877aae928b, named Vedansh Mehrotra, SDGAcademyX and the course Sustainable Development: The Post-Capitalist Order, issued 16 January 2025. No LinkedIn account content was changed.
- The supplied CV explicitly states a top-10 cohort CGPA ranking for two years. The owner requested its inclusion in Beyond the code; no GPA value, cohort size or specific academic years were inferred.
- `qa/content/project-picture-sources.json` records the additional project pictures. The three extra PathForge images are unchanged public product-tour screenshots. ResolveFlow's intake and review images render its existing local Jinja templates with sample data. PlanEase's dashboard uses its public HTML/CSS at the commit above with isolated sample-data modules. These are labelled interface previews, not live backend verification. The CI/CD image is a source-informed architecture sketch, not an application screenshot.
- Four project covers were authored as editable SVG pixel geometry in `scripts/build-project-covers.cjs`. They use the studio palette and distinct project symbols. Local technology marks come from Devicon v2.17.0 under its MIT license (`assets/technologies/LICENSE`); no icon network dependency reaches visitors.
- Owner attachments received during the refresh: `SIP Presentation Vedansh.pptx` and the ResolveFlow audit-history screenshot. The deck's substantive slide bodies are embedded PNGs; they were inspected visually rather than treating leftover template XML as final content. Slides 6 and 8 confirm the release/rollback architecture and CloudWatch/SNS monitoring; slide 10 confirms IAM/OIDC and Parameter Store configuration. Two original slide images and the supplied audit screenshot were copied unchanged into the gallery. No ticket counts, model confidence numbers or performance metrics from the screenshot were promoted into portfolio claims. See `qa/content/presentation/attachment-sources.json`.

## Editorial boundaries

- AWS Educate records are labelled training badges, not AWS professional certifications. The Cloud Ops title follows the actual issuer page.
- Four remaining DataCamp/Google Cloud/edX entries from the CV stay private drafts while individual dates and credential links are pending. The verified SDGAcademyX course is now public alongside the six AWS training badges.
- Project cards now use the owner's requested project-specific pixel emblems. The room composition, animation bytes and animal artwork are unchanged.
- Unconfirmed project metrics, uptime/performance guarantees, project launch dates and personal hobbies are not invented. The internship work is attributed to the internship.
- First-person About copy follows the cloud/backend/applied-AI direction the owner approved. The database remains the live content source after this import.
