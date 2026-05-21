# cmcc-poll

A self-hosted, real-time audience polling tool built for live events. Inspired by Mentimeter — but fully under your control, free to run, and simple enough to trust on stage.

> Built with Next.js 16, Supabase, and zero drama.

---

## How it works

Three devices, three URLs, one session:

| Device | URL | Role |
|---|---|---|
| 📱 Presenter's phone | `/admin/control` | Start session, navigate questions |
| 💻 Laptop (projected) | `/admin/display?token=…` | Live results on the big screen |
| 📱 Audience phones | `/` → `/s/:code` | Join with a 6-digit code and vote |

The presenter authors questions in a plain `questions.md` file committed to the repo. At session start, questions are frozen into a snapshot — editing the file mid-session has no effect.

---

## Question types

```markdown
---
type: single_choice
question: What's your primary role?
options:
  - Developer
  - Designer
  - Other
---

---
type: multiple_choice
question: Which technologies do you use daily?
options:
  - JavaScript
  - Python
  - Docker
  - SQL
---

---
type: scale
question: How would you rate this session?
min: 0
max: 10
labels: ["Not at all", "Extremely positive"]
---

---
type: word_cloud
question: Describe today in one word
max_words: 2
---

---
type: open_ended
question: What would you like to learn next?
---
```

| Type | Input | Notes |
|---|---|---|
| `single_choice` | Radio buttons — one answer only | 2–10 options |
| `multiple_choice` | Checkboxes — one or more answers | 2–10 options |
| `scale` | Slider/numeric | Integer range, optional labels |
| `word_cloud` | Free text | 1–5 words per response, `max_words` default 3 |
| `open_ended` | Text area | Up to 2000 characters |

---

## Session results

When the presenter clicks **End Session**, a results page opens automatically in a new tab at `/admin/results/:id`. It shows:

- Per-question charts (bar charts, word clouds, response lists)
- **Export PDF** — browser print dialog, chart-friendly layout
- **Export CSV** — one section per question with counts and percentages

The results endpoint (`GET /api/admin/sessions/:id/results`) requires the admin code and only returns data for ended sessions.

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/cmcc-poll.git
cd cmcc-poll
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project
2. In the SQL Editor, run the migration:

```bash
# Copy and run the contents of:
supabase/migrations/001_initial.sql
```

3. Go to **Database → Publications → supabase_realtime** and enable the `sessions` table (schema: `public`)

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
ADMIN_CODE=your-secret-admin-password

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=your-secret-key
```

### 4. Validate your questions

```bash
npm run validate
```

### 5. Run locally

```bash
npm run dev
```

---

## Deployment (Vercel)

1. Push this repo to GitHub
2. Import the project on [vercel.com](https://vercel.com) (free Hobby plan)
3. Add the same environment variables from `.env.local` in the Vercel project settings
4. Deploy — Vercel auto-deploys on every push to `main`

Preview deployments are created automatically for every non-`main` branch.

---

## Pre-event checklist

Run through this **15 minutes before going live**:

- [ ] `npm run validate` — zero errors
- [ ] Latest commit deployed on Vercel, deploy succeeded
- [ ] Open `/api/health` — returns `{"status":"ok","db":"connected"}`
- [ ] Open `/admin/control` on your phone, enter admin code, start a **test** session
- [ ] Scan the QR with the laptop — display panel loads and shows the join code
- [ ] Join from a second phone, vote on the first question, verify it appears on the laptop
- [ ] End the test session — results page opens automatically
- [ ] Go live within 30 minutes (to avoid Vercel cold starts)

---

## Architecture notes

- **Questions live in `questions.md`**, not in the database. The DB only stores runtime state: sessions, participants, votes.
- **Audience polling is minimal by design.** `GET /api/sessions/:id/state` returns only 4 fields (no question data, no participant count). The audience client fetches the current question separately, only when the index changes — not on every 2s poll.
- **Admin endpoints are split from public ones.** `GET /api/admin/sessions/:id/state` (requires `X-Admin-Code`) returns the full payload including participant count. The control panel and display panel use this endpoint.
- **Only the display panel uses Supabase Realtime.** The audience and the control panel use HTTP polling (2s/3s interval) — this keeps realtime connections at 1, well within the free tier.
- **One vote per participant per question** is enforced by a DB `UNIQUE` constraint, not just application logic.
- **Anonymous participants** — no login, no PII. Each device generates a UUID stored in `localStorage`.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| Validation | Zod 4 |
| Markdown | gray-matter |
| Database + Realtime | Supabase (free tier) |
| Charts | Recharts |
| Hosting | Vercel (Hobby tier) |
