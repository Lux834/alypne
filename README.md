# Alypne Clips

Alypne Clips is a new Next.js project for a creator-campaign platform. The
current build establishes the Alypne visual identity, responsive marketing
pages, dashboard shells, a secure Discord sign-in foundation, studio
registration, and a tested earnings estimator.

## Run locally

Requirements: Node.js 20.9 or newer and pnpm 10.

```powershell
pnpm install
Copy-Item .env.example .env.local
```

Set these values in `.env.local` before testing authentication:

- `APP_URL`: local or deployed application URL.
- `MONGODB_URI` and `MONGODB_DATABASE`: a restricted MongoDB database.
- `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`: Discord OAuth application.
- `DISCORD_REDIRECT_URI`: exact callback URL registered with Discord, for
  example `http://localhost:3010/api/auth/discord/callback`.
- `SESSION_SECRET`: a private random string of at least 32 bytes. Generate one
  with:
- `ADMIN_DISCORD_ID`: the Discord user ID allowed to administer this instance.
  Configure it before sign-in; the matching account receives the admin role
  when it completes Discord OAuth.

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Start the app:

```powershell
pnpm dev
```

Open [http://localhost:3010](http://localhost:3010). The sign-in page shows
which environment values are still missing. There is no guest sign-in.
Development sample campaigns are marked as previews; production campaign
listings never include preview data.

## Checks

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Current implementation status

Implemented:

- Responsive marketing pages, navigation, contact details, and legal drafts.
- Alypne logo supplied for this project.
- Creator and studio dashboard layouts based on the supplied dark dashboard
  reference. The provided montage is used as a visual reference, not served as
  an image or represented as Alypne product screenshots.
- Creator earnings calculator with validation and unit tests.
- Discord OAuth authorization-code exchange with state verification and
  `identify` scope only.
- Signed HTTP-only session cookies and MongoDB account records.
- Discord profile photo sync using encrypted, identity-bound refresh tokens,
  editable account preferences, and 30-day persistent sessions.
- Studio workspace creation and database-backed studio access checks.
- Studio owner settings for workspace name and public HTTPS banner images.
- Creator/studio workspace switching and an allowlisted admin console for
  account, studio, campaign, moderation, readiness, and audit management.
- Private campaign draft creation, public live-campaign filtering, clip submission,
  duplicate-video protection, and studio approve/reject actions.
- Public campaign API reads only active, public, in-budget campaign records.
- Sitemap and robots metadata.

Still requires external providers or operational setup:

- Verified social metrics, financial ledger, payouts, and Stripe billing.
- Social-platform OAuth integrations and background reconciliation jobs.
- Campaign funding and publishing; publishing stays disabled until billing is
  configured.
- Automated end-to-end tests.
- Final production legal review, operational monitoring, and backup process.

No payment, view verification, or payout operation is simulated. Configure
provider approvals, legal review, monitoring, and backups before operating this
as a public marketplace.
