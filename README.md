# PraktijkFlow

Practice management SaaS for Dutch healthcare practitioners. Handles appointments, patient records, risk scoring, waitlist matching, open-slot recovery, SMS/email reminders, invoicing, and subscription billing.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.2 (App Router, Turbopack) |
| Language | TypeScript 5, React 19 |
| Database | PostgreSQL, Prisma 7.6 (`@prisma/adapter-pg`) |
| Auth | Firebase Auth (client + Admin SDK), HttpOnly session cookies |
| Payments | Stripe 22 (subscriptions, checkout, webhooks) |
| SMS | Twilio REST API (optional — mock mode when unconfigured) |
| Validation | Zod 4 |
| Styling | Tailwind CSS 4 |
| Testing | Vitest 4 |
| Fonts | Geist (via `next/font/local`) |

## Prerequisites

- **Node.js** >= 20
- **PostgreSQL** >= 14
- **Firebase project** with Authentication enabled (Email/Password provider)
- **Stripe account** with products and webhook configured
- **Twilio account** (optional — SMS reminders log to console without it)

---

## Local setup

### 1. Clone and install

```bash
git clone <repo-url> praktijkflow
cd praktijkflow
npm install
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in every value. See [Service setup](#service-setup) below for where to find each credential.

### 3. Database

Create a PostgreSQL database:

```bash
createdb praktijkflow
```

Run migrations and generate the Prisma client:

```bash
npm run db:migrate
npm run db:generate
```

### 4. Seed (optional, recommended for development)

Seeds the database with a sample practice, 2 practitioners, 15 patients, 25 appointments, waitlist entries, message templates, and invoices:

```bash
npm run db:seed
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Register a new account — the seed data is linked to Firebase UIDs that won't match yours, so you'll start with an empty practice until you create one or re-seed after registering.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Run pending migrations (dev) |
| `npm run db:seed` | Seed database (`tsx prisma/seed.ts`) |
| `npm run db:reset` | Reset database + re-run all migrations |
| `npm run db:studio` | Open Prisma Studio GUI |

---

## Tests

```bash
npx vitest run
```

35 tests across 3 suites:
- `src/lib/risk/engine.test.ts` — 19 tests (pure risk calculation)
- `src/lib/tokens/crypto.test.ts` — 9 tests (token generation + hashing)
- `src/lib/waitlist/matching.test.ts` — 7 tests (scored waitlist matching)

---

## Build

```bash
npm run build
```

Verify zero errors. The build output shows all routes — static (`○`) and dynamic (`ƒ`).

---

## Project structure

```
src/
├── app/
│   ├── (auth)/           # Login, register pages
│   ├── (dashboard)/      # Dashboard, appointments, patients, open-slots, waitlist
│   ├── action/[token]/   # Public patient action links (confirm/cancel/claim)
│   ├── api/              # All API routes
│   │   ├── auth/         #   session, register, logout, me
│   │   ├── appointments/ #   CRUD, status, reminders, import, risk recalc
│   │   ├── patients/     #   CRUD
│   │   ├── open-slots/   #   CRUD, matches, offer
│   │   ├── waitlist/     #   CRUD
│   │   ├── tokens/       #   create, execute
│   │   ├── stripe/       #   checkout, portal, webhook
│   │   └── dashboard/    #   KPI aggregation
│   └── pricing/          # Public pricing page
├── components/           # React components by domain
├── lib/
│   ├── auth/             # Session management (getCurrentUser, requireUser)
│   ├── firebase/         # Client + Admin SDK init
│   ├── stripe/           # Stripe client + plans
│   ├── risk/             # Risk engine (pure) + DB wrappers
│   ├── tokens/           # Action token lifecycle (create, lookup, execute)
│   ├── reminders/        # SMS/email reminder service + templates
│   ├── waitlist/         # Scored matching algorithm
│   ├── open-slots/       # Open slot creation from cancellations
│   ├── validations/      # Zod schemas
│   └── db.ts             # Prisma client singleton
└── generated/prisma/     # Generated Prisma client (gitignored)

prisma/
├── schema.prisma         # Database schema (all models)
├── seed.ts               # Dev seed data
└── migrations/           # Migration history
```

---

## Service setup

### PostgreSQL

**Local:**

```bash
# macOS
brew install postgresql@16 && brew services start postgresql@16

# Ubuntu/Debian
sudo apt install postgresql && sudo systemctl start postgresql

# Windows
# Use the installer from https://www.postgresql.org/download/windows/

createdb praktijkflow
```

Set in `.env.local`:

```
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/praktijkflow?schema=public"
```

**Production (Vercel + Neon/Supabase):**

Use a managed PostgreSQL provider. Copy the connection string into your Vercel environment variables. For connection pooling, use the pooled URL as `DATABASE_URL`.

---

### Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project (or use an existing one).
2. Enable **Authentication** > **Sign-in method** > **Email/Password**.
3. Go to **Project Settings** > **General** > **Your apps** > **Web app** — register one if needed. Copy the config values:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

4. Go to **Project Settings** > **Service accounts** > **Generate new private key**. From the downloaded JSON, extract:

```
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

> **Note:** The private key must be quoted. Newlines can be literal `\n` — the app handles both formats.

---

### Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/).
2. Copy your **Publishable key** and **Secret key** from **Developers** > **API keys**:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

3. Create 3 subscription products (Starter, Pro, Enterprise) in **Products**. Each needs a recurring price. Copy the price IDs:

```
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID=price_...
```

4. Set up a webhook at **Developers** > **Webhooks**:
   - **Endpoint URL:** `https://your-domain.com/api/stripe/webhook`
   - **Events:** `checkout.session.completed`
   - Copy the **Signing secret**:

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Local testing with Stripe CLI:**

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the webhook signing secret from the CLI output
```

---

### Twilio (optional)

SMS reminders are optional. When Twilio credentials are missing, reminders log to the console instead of sending real SMS.

1. Sign up at [Twilio Console](https://console.twilio.com/).
2. Get your **Account SID** and **Auth Token** from the dashboard.
3. Buy or configure a phone number with SMS capability.

```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+31612345678
```

---

## Vercel deployment

### 1. Connect repository

Import your Git repository in the [Vercel Dashboard](https://vercel.com/new).

### 2. Environment variables

Add all variables from `.env.local.example` to **Settings** > **Environment Variables**. Key differences from local:

| Variable | Production value |
|----------|-----------------|
| `DATABASE_URL` | Your managed PostgreSQL connection string |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` |
| `STRIPE_WEBHOOK_SECRET` | The production webhook signing secret (not the CLI one) |
| `FIREBASE_PRIVATE_KEY` | Paste the full key including `-----BEGIN/END-----` markers |

### 3. Build settings

Vercel auto-detects Next.js. No custom build command needed. The default works:

- **Build command:** `next build`
- **Output directory:** `.next`
- **Install command:** `npm install`

### 4. Database migrations

Prisma migrations need to run against your production database. Options:

**Option A — Run locally against production DB:**

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

**Option B — Add a build step in Vercel:**

In **Settings** > **General** > **Build & Development Settings**, set the build command to:

```bash
prisma generate && prisma migrate deploy && next build
```

### 5. Stripe webhook

Update your Stripe webhook endpoint URL to your production domain:

```
https://your-domain.com/api/stripe/webhook
```

### 6. Post-deploy verification

- [ ] Visit `/login` — Firebase Auth loads
- [ ] Register a new account — user created in Firebase + PostgreSQL
- [ ] Visit `/dashboard` — KPIs load
- [ ] Visit `/pricing` — Stripe checkout works
- [ ] Test a patient action link — token flow works

---

## Multi-tenancy

All data is scoped by `practiceId`. Every API route calls `getCurrentUser()` and filters queries by `user.practiceId`. There is no cross-tenant data access.

A user can be a member of one practice (via the `PracticeMember` join table) with roles: `OWNER`, `ADMIN`, `PRACTITIONER`, or `ASSISTANT`.

---

## Key flows

### Appointment lifecycle

```
SCHEDULED → CONFIRMED → IN_PROGRESS → COMPLETED
     ↓           ↓
  CANCELLED    NO_SHOW
     ↓
  OpenSlot created → matched to waitlist → token sent → patient claims
```

### Risk scoring

Each appointment gets a `riskScore` (0-100) and `riskLevel` (LOW/MEDIUM/HIGH/CRITICAL) based on the patient's cancellation/no-show history, lead time, day-of-week patterns, and time-of-day patterns. Risk is recalculated on status changes.

### Token actions

Patients receive one-time links (via SMS/email) to confirm, cancel, or claim appointments. Tokens are SHA-256 hashed before storage — raw tokens are never persisted. Each token can only be used once.

### Waitlist matching

When a slot opens, the system scores waitlist entries by type preference (+30), day preference (+25), time preference (+20), flexibility (+5), and seniority (+1). The best match gets an offer with a claim token.

---

## MVP limitations

This is an MVP. Known limitations:

- **No real-time updates** — dashboard and lists require manual refresh
- **No pagination controls** — API supports pagination but the UI doesn't expose page navigation
- **No email sending** — only SMS via Twilio; email templates exist but no email transport is configured
- **No file uploads** — no avatar or document upload support
- **No recurring appointments** — each appointment is standalone
- **No calendar view** — appointments are list-only
- **No mobile navigation** — sidebar is hidden on small screens with no hamburger menu
- **No i18n** — UI is in English, date formatting is nl-NL
- **Single practice per user** — the schema supports multiple but the UI assumes one
- **No rate limiting** — API routes have no request throttling
- **No RBAC enforcement** — roles exist in the schema but are not checked in API routes
- **Seed data uses hardcoded Firebase UIDs** — seed is for schema validation, not for login testing
- **Invoice PDF export** — not implemented, data model only
- **Billing/Settings pages** — sidebar links exist but point to `/dashboard` (placeholder)

---

## Troubleshooting

### `prisma generate` fails

```
Error: Cannot find module '@prisma/client'
```

The Prisma client generates to `src/generated/prisma`. Make sure your import paths use:

```typescript
import { PrismaClient } from "@/generated/prisma";
```

If it still fails, delete `node_modules` and reinstall:

```bash
rm -rf node_modules && npm install && npm run db:generate
```

### Firebase private key errors

```
Error: Failed to parse private key
```

Ensure the key is properly quoted in `.env.local` and includes the full `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers. Newlines can be literal `\n` characters:

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

### Database connection refused

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

Ensure PostgreSQL is running:

```bash
# macOS
brew services start postgresql@16

# Linux
sudo systemctl start postgresql

# Windows
net start postgresql-x64-16
```

Verify the `DATABASE_URL` in `.env.local` matches your PostgreSQL user/password/database.

### Stripe webhook signature verification fails

```
Error: No signatures found matching the expected signature
```

- **Local:** Make sure you're using the signing secret from `stripe listen`, not from the Stripe Dashboard.
- **Production:** Make sure the webhook endpoint URL matches exactly and you're using the production signing secret.

### Twilio SMS not sending

If `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, or `TWILIO_PHONE_NUMBER` are missing or empty, Twilio runs in mock mode and logs messages to the console. This is expected in development.

To verify mock mode is active, check the server console for:

```
[Twilio Mock] Would send SMS to +31612345678: ...
```

### Build fails with type errors after schema changes

After changing `prisma/schema.prisma`, always regenerate before building:

```bash
npm run db:generate && npm run build
```

### `params` or `searchParams` type errors

Next.js 16 changed `params` and `searchParams` to be Promises. Page components must `await` them:

```typescript
// Correct (Next.js 16)
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

---

## License

Proprietary. All rights reserved.
