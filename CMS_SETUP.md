# Studio CMS operation

Implemented and deployed on 22 October 2026. Public studio: https://after-hours-portfolio-virid.vercel.app/. Owner desk: https://after-hours-portfolio-virid.vercel.app/admin.

## Current status

- Vercel serves the existing HTML/CSS/JavaScript studio and five Node API entry points. No frontend framework was added.
- Neon Postgres stores content, publication snapshots, authentication sessions, media metadata, contact delivery state and rate limits.
- Private Vercel Blob stores uploaded photos and PDFs. The original room assets remain static and unchanged.
- Development and production use separate databases and Blob stores. Local CMS checks operate on development data.
- The owner account is provisioned. Public sign-up is disabled and every admin/draft/upload request checks the authenticated owner's email server-side.
- Resend is connected with a secret in Vercel Production. The owner confirmed successful production sign-in through the emailed reset link and actual receipt of the Contact test. The current `onboarding@resend.dev` sender delivers only to the Resend account's own email.

## Owner first login

1. Configure Resend as described below, then deploy again so the new environment variable reaches the functions.
2. Open `/admin`, enter the configured owner email and select **FIRST LOGIN / RESET PASSWORD**.
3. Open the private email link and set a password of 14–128 characters. Do not share the reset URL or password.
4. Sign in at `/admin`. There is no public account-creation screen.

The initial provisioning script generates an unknown random password without printing it. Running it again leaves an existing account's password unchanged. Reset tokens are handled by Better Auth; the reset page clears the token from the visible URL after reading it. Sessions last 24 hours and a password reset revokes existing sessions. Sign out on shared devices. Nested auth routes are explicitly rewritten to `api/auth.js`, including the library's emailed reset callback; public registration remains denied.

## Editing and publishing

The five tabs cover Projects, About, Journey, Resume and Certifications & learning. Contact's receiving inbox is a private server setting rather than editable public content.

1. Select a record or add one. Edit its text, links, status and display order. Stable IDs identify records; project slugs are used in public URLs.
2. **SAVE DRAFT** persists changes privately. It does not alter the public studio.
3. **PREVIEW DRAFT** opens the studio using the signed-in owner's draft snapshot. Anonymous visitors cannot access that snapshot.
4. **PUBLISH** publishes the currently saved section. Records marked draft stay private. Save pending edits before publishing.
5. **UNPUBLISH** removes that section from public reads and removes its published media references. Its saved draft remains available to the owner.
6. **DISCARD EDITS** reloads the last saved draft. A stale revision is rejected with a conflict instead of overwriting another tab's changes.

Projects support card previews and case-study fields. About remains personal. Journey records support photos, dates, descriptions and results, with explicit Display order and six pins per board page (up to 100 records). Add a new record as a private draft, edit its story and optional photo, save, then mark it published and publish the section. Unillustrated records use a pixel document card automatically; no code change is needed. Dates may stay blank. Resume supports chapters and nested entries independently of its downloadable PDF. The certification shelf supports entry type, issuer, completion date, credential ID, verification URL, image and optional certificate PDF, alongside ordinary learning notes. Its internal database/API key remains `notes`.

The owner-approved content import supplies four projects, cloud/backend/applied-AI About copy, six professional milestones, six Resume chapters and seven public credentials (six AWS training badges and one verified edX course). Four other course records remain private drafts. Projects include editable short highlights, process steps, engineering notes and captioned gallery pictures. These optional fields live in the existing JSON content record; no SQL migration is required. Live edits belong in the dashboard; migrations do not replace them. `content/portfolio.cjs` preserves the current import and `content/CONTENT_SOURCES.md` records its sources. The importer refuses to replace unrelated owner edits and saves a local backup before a transaction; these backups are Git-ignored and excluded from deployment. For a reviewed later revision, `--expected=path/to/baseline.json` supplies an exact expected old bundle. Any intervening dashboard edit still stops the import.

## Uploads and backups

- Upload PNG, JPEG or WebP images, or a PDF for the resume. Maximum size is 4,000,000 bytes per upload. SVG/executable uploads are rejected. File signatures are checked server-side.
- Uploads stay private while only present in drafts. Publishing a section makes its referenced uploads readable through `/api/media?id=…`. Unpublishing removes that public permission unless another published section still references the file.
- The same publication-based permissions apply to uploaded credential images and certificate PDFs. The six initially imported AWS badge images are static copies of public issuer artwork, so they remain public static assets.
- Original static assets under `/assets/` remain publicly served. Unpublishing a CMS section does not remove a static file from the website package.
- **EXPORT BACKUP** downloads content snapshots and media metadata as JSON. It does not download the actual photo/PDF bytes and there is no import button yet. Keep original uploaded files separately.
- Removing an upload reference from a draft does not immediately delete the stored binary. A media library/garbage-collection interface is not included in this release.

## Resend setup for the initial own-inbox sender

The user chose their Gmail inbox as both the Contact recipient and owner account. Use that same email when creating the Resend account. With `onboarding@resend.dev`, Resend only permits delivery to its account email. A verified domain is required to send to other addresses. See [Resend's own-inbox restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

1. Create the free account at https://resend.com/signup and verify its email.
2. Open https://resend.com/api-keys. Create a key named `After Hours` with **Sending access**. Copy its value privately; Resend does not show it again.
3. In the project's Vercel environment settings, create `RESEND_API_KEY`, select **Production**, choose the **Secret** type (or Sensitive toggle) and save. Never paste the key into chat or source files.
4. The production sender, recipient, allowed origin and enable flag are already configured. Redeploy the current application so the key is injected into its functions.
5. Send one Contact test and verify both the application's result and actual inbox arrival. A provider acceptance response alone does not prove inbox delivery. Then request the owner first-login/reset email.

Email is sent server-side to the configured recipient. The optional visitor address becomes Reply-To; it cannot select a different recipient. Durable limits are five requests per ten minutes per client and forty per day overall. The client identifier is an HMAC, rather than a stored raw IP. Duplicate submissions are suppressed and retried provider requests retain an idempotency key. Messages remain private in the database; there is no inbox viewer in the owner dashboard yet.

## Private server settings

See `.env.example` for names. Never put these in frontend JavaScript or commit real environment files.

| Setting | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled Neon runtime connection |
| `DATABASE_URL_UNPOOLED` | Direct connection for migrations |
| `SITE_ORIGIN`, `BETTER_AUTH_URL` | Exact canonical origin; local CMS uses `http://127.0.0.1:4180` |
| `BETTER_AUTH_SECRET` | Random private authentication secret |
| `ADMIN_EMAIL` | Sole permitted owner's email |
| `BLOB_READ_WRITE_TOKEN` | Environment-specific private Blob credential |
| `CONTACT_ENABLED` | Delivery enable flag; other mail settings must also exist |
| `RESEND_API_KEY` | Private sending key |
| `CONTACT_FROM`, `CONTACT_TO`, `CONTACT_ORIGIN` | Sender, private recipient and allowed Contact origin |

Vercel integrations inject database and Blob credentials into their respective environment only. `.env.local` contains development values; `.env.production.local` contains production values used privately for provisioning. Both are ignored and excluded from deployment uploads. A sensitive Vercel key may be unavailable to a local environment pull; it can still be injected at runtime by a new deployment.

## Local development

Use a current Node.js runtime that supports `--env-file`. Install from the lockfile with `npm ci`. Populate `.env.local` privately using development resources before running database commands.

```powershell
npm run db:migrate
npm run owner:setup
npm run dev:cms
```

Open http://127.0.0.1:4180/. Migrations preserve existing seeded content and the owner setup does not reset an existing account. Do not run test setup against production credentials. The legacy `npm run dev` Python server on port 4173 remains useful for isolated frontend fixtures but does not execute the backend.

## Validation

```powershell
npm run test:unit
npm test
node --env-file=.env.local scripts/verify-cms.cjs
node --env-file=.env.local scripts/verify-contact-storage.cjs
node --env-file=.env.local scripts/verify-owner-reset.cjs
```

The real CMS verification requires the local CMS server, a privately configured development `CMS_TEST_PASSWORD`, and isolated development database/Blob credentials. It temporarily edits development content and restores it. The reset check creates a private development token, resets to the same test password, checks single use/session revocation and deletes its token. Repeated runs can hit the five-logins-per-five-minutes limit; wait for the normal cooldown. Contact storage verification uses a controlled provider transport and sends no real email. Never point these scripts at production data.

For public live smoke checks:

```powershell
$env:DEPLOYMENT_URL='https://after-hours-portfolio-virid.vercel.app'
node scripts/verify-deployment.cjs
```

If mail is configured, that live script sends one Contact test to the configured inbox. Otherwise it verifies the unavailable-delivery response and draft retention. Evidence and limitations are recorded in `qa/cms/CMS_VERIFICATION.md` and `qa/deployment/CMS_DEPLOYMENT_VERIFICATION.md`.
