# 🏢 ReservaCore

![CI](https://github.com/<your-username>/reservacore/actions/workflows/ci.yml/badge.svg)

A centralized resource reservation system for shared facilities and equipment (meeting rooms, projectors, vehicles). It replaces informal scheduling with a single source of truth and **guarantees no double-bookings**, even when two people book at the same instant.

- 🌐 **Live app:** [LIVE_URL](https://reservacore.vercel.app) (hosted on Vercel with Neon PostgreSQL; the first load can take a few seconds while the database wakes up)
- 🎥 **Demo video:** <VIDEO_LINK>
- 🗂️ **ER diagram (shareable link):** [ER_Diagram](https://drive.google.com/file/d/1JJJgbeoPBem8jQO4fZSwpprrVTElsmxI/view?usp=sharing)
- 📘 **Case study (problem, interpretation, trade-offs):** [docs/CASE_STUDY.md](docs/CASE_STUDY.md)
- 📐 **UML diagrams (use case, class, sequence, deployment):** [docs/diagrams.md](docs/diagrams.md)

---

## ✨ Features

- 📊 **Dashboard:** total resources, today's bookings, resources free right now, upcoming reservations
- 🧰 **Resource management:** create, edit, deactivate and reactivate resources (admin only)
- 🔎 **Search and filters:** resources by name, type and status; reservations by scope, resource, date, status and owner
- 📅 **Reservations:** book, view upcoming and past bookings, cancel (owner or admin)
- ✏️ **Reschedule in place:** move a booking to another time without cancelling; the same conflict protection applies
- 🕒 **Availability timeline:** per-resource day view showing free and booked slots
- 🚫 **Conflict prevention:** overlapping bookings are rejected by PostgreSQL itself
- 💡 **Smart alternatives:** when a slot is taken, the app suggests the nearest free slots and other free resources of the same type
- 🕘 **Booking rules:** bookings run 06:00-22:00 on a single day and last up to 8 hours
- 🔐 **Authentication and roles:** email and password sign-in, with admin and member permissions enforced on the server
- 🧪 **Tested and automated:** 31 automated tests, plus a CI pipeline and continuous deployment

---

## 🧰 Tech stack

Next.js 16 (App Router) · TypeScript · PostgreSQL 16 · Prisma 6 · Tailwind CSS v4 · shadcn/ui · Zod · jose + bcryptjs · Vitest · Docker (local database) · GitHub Actions · Vercel + Neon

## 📝 Prerequisites

- Node.js 22 or newer
- Docker Desktop (for PostgreSQL), or any local PostgreSQL 16 instance

> Don't have Docker? Any PostgreSQL 16 works. Create a database, set `DATABASE_URL` in `.env`, then continue from `npx prisma migrate deploy`.

---

## 🚀 Getting started

```bash
git clone <repo-url>
cd reservacore
npm install

# 1. Environment
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
# optional: replace AUTH_SECRET in .env with a random 32+ character string

# 2. Database
docker compose up -d        # PostgreSQL on localhost:5433

# 3. Schema and demo data
npx prisma migrate deploy   # applies migrations, including the overlap constraint
npm run db:seed             # demo users, resources and reservations

# 4. Run
npm run dev                 # http://localhost:3000
```

---

### ⚙️ Environment variables

```env
DATABASE_URL="postgresql://reservacore:reservacore@localhost:5433/reservacore?schema=public"
AUTH_SECRET="change-me-to-a-long-random-string-at-least-32-characters"
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (the default matches `docker-compose.yml`) |
| `AUTH_SECRET` | Secret used to sign session cookies (32+ characters) |

---

### 🧾 Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | Lint |
| `npm run typecheck` | TypeScript type-check |
| `npm test` | Test suite (needs the test database, see Testing) |
| `npm run db:seed` | Reset and seed demo data (clears existing reservations) |

---

## 🔑 Demo accounts

All demo accounts use the password **`Demo@1234`** (demo data only).

| Email | Role |
|---|---|
| admin@reservacore.dev | Admin |
| nimal@reservacore.dev | Member |
| sara@reservacore.dev | Member |

---

## 🔐 Authentication and authorization

- Passwords are hashed with **bcrypt**; plain-text passwords are never stored
- A successful login sets a **signed JWT** (HS256) in an **HttpOnly, SameSite=Lax** cookie that expires after 8 hours (`Secure` in production)
- Every page and Server Action resolves the current user from the session; unauthenticated requests are redirected to `/login`
- **Roles are enforced on the server:** only admins manage resources; only the booking owner or an admin can reschedule or cancel a booking
- Login errors are generic ("Invalid email or password"), and a dummy hash comparison keeps timing similar for unknown emails
- Server Actions use Next.js built-in origin checks, which together with SameSite cookies protect against CSRF

---

## 🕘 Booking rules

| Rule | Value |
|---|---|
| Opening hours | 06:00-22:00, Sri Lanka time |
| Maximum length | 8 hours |
| Span | A single day |
| Past bookings | Not allowed |

The rules are global constants in `lib/rules.ts`, enforced in the service layer for both new bookings and rescheduling.

---

## 🏗️ Architecture

```
app/
  (app)/             authenticated pages: dashboard, resources, reservations (list, new, reschedule)
  login/             sign-in page
  actions/           Server Actions (thin: authenticate, validate, call services)
lib/
  services/          business rules and data access (reservations, resources, dashboard)
  auth.ts            session creation and verification
  current-user.ts    current user resolution and admin guard
  rules.ts           booking rule constants
  validators.ts      Zod schemas
  format.ts          Sri Lanka time helpers
  db.ts              Prisma client
components/          UI components
prisma/              schema, migrations, seed
tests/               Vitest suite
docs/                case study and diagrams
.github/workflows/   CI pipeline
docker-compose.yml   local PostgreSQL
```

Pages and Server Actions stay thin. Business rules (validation, booking rules, conflict handling, permissions, alternatives) live in `lib/services`, so they are testable without the UI.

---

## 🗄️ Database design

Three entities: **User**, **Resource**, **Reservation** (a resource has many reservations, a user has many reservations).

![ER diagram](docs/diagrams/er.png)

- 🔒 **Overlap prevention is enforced by PostgreSQL**, not only by application code
- 🗃️ **Cancel, don't delete:** reservations have a `CONFIRMED` / `CANCELLED` status, so history is kept and cancelled bookings free the slot
- 🔌 **Deactivate, don't delete:** inactive resources can't receive new bookings, but history is kept
- 🌏 **`timestamptz` everywhere:** stored in UTC, displayed in Sri Lanka time
- ⚡ Foreign keys, plus indexes on `(resourceId, startTime)`, `userId` and `Resource.type`

---

## 🛡️ How double-booking is prevented

A check-then-insert approach ("look for a conflict, then insert") has a race condition: two simultaneous requests can both pass the check. Instead, the database enforces the rule with an exclusion constraint:

```sql
ALTER TABLE "Reservation" ADD CONSTRAINT no_overlapping_reservations
  EXCLUDE USING gist (
    "resourceId" WITH =,
    tstzrange("startTime", "endTime", '[)') WITH &&
  ) WHERE (status = 'CONFIRMED');
```

- Two bookings conflict when they are for the same resource and `existing.start < new.end AND existing.end > new.start`
- Ranges are end-exclusive (`[start, end)`), so a booking may start exactly when another ends
- Cancelled bookings are excluded, so they free the slot
- `CHECK ("endTime" > "startTime")` rejects invalid ranges
- Rescheduling is an `UPDATE`, so the same constraint protects it
- The service catches the database error and turns it into a clear message naming the clashing booking, plus alternatives

---

## 💡 Design highlights

- **Correctness at the database level:** no code path, including future ones, can create a double booking
- **Helpful failures:** a rejected booking offers the nearest free slots (same duration, same day) and other free resources of the same type as one-click pre-filled links
- **Thin controllers, tested services:** rules live in one layer that the tests exercise directly
- **Proof, not claims:** the suite includes tests that bypass the service and a test that fires 8 simultaneous requests for one slot
- **Accountability:** every booking has an owner and a purpose; history is never deleted

---

## 🌏 Time zones

Form times are interpreted as Sri Lanka time (UTC+05:30) and stored as UTC in `timestamptz` columns, so server time zones never matter. For example, a booking entered as 11:00 is stored as 05:30 UTC and displayed as 11:00 again.

---

## 🧪 Testing

**31 automated tests** (Vitest) run against a separate PostgreSQL database so they never touch your data. They exercise the service layer and the real database constraints, with no mocks.

```bash
docker exec reservacore-db psql -U reservacore -d reservacore -c "CREATE DATABASE reservacore_test;"
# create .env.test containing:
# DATABASE_URL="postgresql://reservacore:reservacore@localhost:5433/reservacore_test?schema=public"
# apply migrations to the test database (PowerShell shown):
$env:DATABASE_URL="postgresql://reservacore:reservacore@localhost:5433/reservacore_test?schema=public"; npx prisma migrate deploy; Remove-Item Env:DATABASE_URL
npm test
```

The test setup refuses to run unless the database name contains `test`.

<details>
<summary><strong>📋 Automated test cases (31)</strong></summary>

| Area | Test case | Expected result |
|---|---|---|
| Conflict prevention | Create a valid reservation | Created with status CONFIRMED |
| Conflict prevention | Same slot as an existing booking | Rejected (conflict) |
| Conflict prevention | Starts inside an existing booking | Rejected |
| Conflict prevention | Ends inside an existing booking | Rejected |
| Conflict prevention | Fully contained in an existing booking | Rejected |
| Conflict prevention | Fully contains an existing booking | Rejected |
| Conflict prevention | Back-to-back bookings (end equals next start) | Allowed |
| Conflict prevention | Same time on a different resource | Allowed |
| Conflict prevention | Book a slot after the earlier booking was cancelled | Allowed (cancelled bookings free the slot) |
| Conflict prevention | Conflict error message | Names the clashing booking |
| Conflict prevention | Conflict response | Includes free slots and other free resources |
| Validation | End before start | Rejected |
| Validation | Zero-length booking | Rejected |
| Validation | Booking in the past | Rejected |
| Validation | Inactive resource | Rejected |
| Booking rules | Longer than 8 hours | Rejected |
| Booking rules | Exactly 8 hours | Accepted |
| Booking rules | Starts before 06:00 | Rejected |
| Booking rules | Ends after 22:00 | Rejected |
| Database level | Overlapping insert that bypasses the service | Rejected by the exclusion constraint |
| Database level | Invalid time range that bypasses the service | Rejected by the CHECK constraint |
| Concurrency | 8 simultaneous requests for the same slot | Exactly 1 succeeds, 7 get a conflict, 1 row stored |
| Cancellation | Owner cancels | Status becomes CANCELLED |
| Cancellation | Another member cancels | Forbidden |
| Cancellation | Admin cancels anyone's booking | Allowed |
| Rescheduling | Move to a free slot | Booking updated |
| Rescheduling | Move to a time overlapping its own previous time | Allowed |
| Rescheduling | Move onto another booking | Rejected with free-slot suggestions |
| Rescheduling | Other member vs admin | Forbidden vs allowed |
| Rescheduling | Reschedule a cancelled booking | Rejected |
| Rescheduling | Reschedule violating the booking rules | Rejected |

</details>

<details>
<summary><strong>🖱️ Manual test scenarios (UI and authentication)</strong></summary>

The user interface and login flow are verified manually rather than by automated tests.

| Scenario | Expected result |
|---|---|
| Open any page while signed out | Redirected to the login page |
| Sign in with a wrong password or unknown email | Same generic error message |
| Sign out, then use the browser Back button | Protected pages stay inaccessible |
| Member opens `/resources/new` | Redirected away; no "Add resource" button |
| Book an overlapping slot | Clash message plus one-click alternatives |
| Click a suggested slot, then confirm | Form pre-filled; booking succeeds |
| Cancel a booking, then rebook the same slot | Succeeds |
| Reschedule a booking | Success message and updated time in the list |
| Admin deactivates a resource | Hidden from the booking form; history kept |
| Stop the database and reload a page | Friendly error page with a retry button |

</details>

---

## 🔄 CI/CD

- **CI (GitHub Actions):** on every push and pull request, the pipeline installs dependencies, applies the migrations to a PostgreSQL service container, lints, type-checks, runs the 31 tests, and builds the app
- **CD (Vercel):** every push to `main` deploys to production, and pull requests get preview deployments
- **Migrations** are applied manually with `npx prisma migrate deploy`, which keeps schema changes deliberate

---

## ☁️ Deployment

Hosted on **Vercel** with a **Neon** PostgreSQL database. Configuration is two environment variables, `DATABASE_URL` and `AUTH_SECRET`, and a `postinstall` script (`prisma generate`). The database was prepared with `npx prisma migrate deploy` and `npm run db:seed`.

---

## ⚠️ Assumptions and limitations

- Bookings are single-day ranges entered in Sri Lanka time; no recurrence, approval workflow or notifications
- Opening hours and maximum duration are global rules, not per-resource settings
- No self-registration, password reset or login rate limiting (accounts are seeded); an internal tool normally provisions accounts through an admin or company sign-in
- The live demo database is shared and its seeded dates age over time

---

## 🔮 Next steps

- Per-resource opening hours and maximum duration
- Self-registration or admin-created accounts, then password reset and login throttling
- Full calendar view
- Email or chat notifications

---