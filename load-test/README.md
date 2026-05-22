# Load testing cmcc-poll

This directory contains a k6 load test that simulates a realistic Mentimeter-style live event against your deployed app, plus a GitHub Actions workflow to run it on demand.

## What it does

The test spins up **two parallel scenarios**:

- **`audience`** — N virtual users (default 200) that join the session with staggered timing, poll `/state` every 2s, fetch the current question, simulate 3–15s of "think time", then submit a vote. They keep going until the session ends or the time cap is reached. The vote payload is generated dynamically based on the question type, so it adapts to whatever `questions.md` is currently deployed.
- **`controller`** — 1 virtual user that plays the role of the presenter. It reads how many questions there are from the state endpoint, waits `QUESTION_DURATION_S` seconds, then `PATCH`es `action: "next"` to advance. After the last question, it sends `action: "end"`.

`setup()` creates a fresh session at the start. `teardown()` makes a best-effort attempt to end it cleanly if anything went wrong.

## Endpoints exercised

| Method | Path | Notes |
|---|---|---|
| POST | `/api/admin/sessions` | Once, in setup — auth via `X-Admin-Code` |
| GET | `/api/sessions/by-code/:code` | Once per VU |
| POST | `/api/sessions/:id/participants` | Once per VU |
| GET | `/api/sessions/:id/state` | Polled every 2s per VU |
| POST | `/api/sessions/:id/votes` | Once per VU per question |
| PATCH | `/api/admin/sessions/:id` | By controller, to advance/end |

## Running locally

You need [k6 installed](https://grafana.com/docs/k6/latest/set-up/install-k6/).

```bash
# Smoke test first — 5 users, faster timing, to confirm the script works end-to-end
BASE_URL=https://cmcc-poll.vercel.app \
ADMIN_CODE=your-real-admin-code \
VUS=5 \
QUESTION_DURATION_S=15 \
RAMP_UP_S=5 \
k6 run load-test/k6-script.js

# Full 200-user run with realistic timing
BASE_URL=https://cmcc-poll.vercel.app \
ADMIN_CODE=your-real-admin-code \
k6 run load-test/k6-script.js
```

The script logs the session code at startup — you can open `/s/<code>` in a browser to watch the bots vote in real time on the laptop display panel. Highly recommended for the first run, it's a great smoke test that the whole stack is reacting.

## Running from GitHub Actions

1. Add the admin code as a repo secret: **Settings → Secrets and variables → Actions → New repository secret**, name `ADMIN_CODE`.
2. Go to **Actions → Load test (k6) → Run workflow**.
3. Pick the inputs (defaults are 200 VUs, 45s per question, 30s ramp-up) and click **Run workflow**.
4. Watch the live logs. The k6 summary is uploaded as an artifact called `k6-summary` at the end.

Note: a single GitHub Actions runner generates traffic from one IP. Vercel and Supabase don't rate-limit aggressively on a single IP for normal traffic, but if you hit rate-limit-style errors (429s, sudden failure spikes), that's the most likely cause. The fix is to split across multiple runners with a matrix — not needed for the first run, add it only if you see signs of single-IP throttling.

## Reading the results

k6 prints a summary at the end. The most important sections:

- **`http_req_duration`** — overall HTTP latency. Look at p95 and p99.
- **`latency_state`, `latency_vote`, `latency_join`** — per-endpoint custom metrics. These are the ones to scrutinize.
- **`http_req_failed`** — failure rate. Should stay under 5% (the threshold).
- **`votes_submitted`** — total successful votes. For 200 VUs × 7 questions, expect ~1300+ (some VUs will miss a question if their think time spans an advance).
- **`votes_rejected`** — non-409 vote failures. If this is non-zero, look at the warnings in the log — there's a bug in the payload shape.
- **`checks`** — assertion pass rate. Should be 100% or close.

### Where it's likely to break

In order of plausibility, before the actual SUT (system under test) limits:

1. **Supabase free-tier connection cap on writes.** 200 simultaneous vote POSTs hit the database hard. If you see `latency_vote` p95 climbing into multiple seconds during the voting bursts, that's the connection pool saturating.
2. **Vercel function cold starts** at the very beginning of the test. The first few state polls might show high latency, then settle. Mitigation: hit `/api/health` (or any endpoint) once before starting the test.
3. **`/state` endpoint** returns the full question payload on every poll (200 VUs × 0.5 Hz = 100 req/s on `/state` alone). Bandwidth and DB-read pressure live here. This is exactly the inefficiency the deferred refactor was meant to fix.

## Pre-event checklist

Run the smoke test (`VUS=5`) at least once **before the real event**, ideally a few days ahead. If anything breaks, you have time to fix. If it passes, run the full 200-VU test once to confirm the production deployment holds up. After the test, manually verify in the Supabase dashboard that the test session shows `status='ended'`, and optionally delete it to keep the DB clean.

## Tuning the test

All knobs are env vars at the top of `k6-script.js`:

| Var | Default | What it does |
|---|---|---|
| `VUS` | 200 | Number of simulated audience members |
| `QUESTION_DURATION_S` | 45 | Seconds per question before controller advances |
| `RAMP_UP_S` | 30 | Window over which audience trickles in at the start |
| `AUDIENCE_DURATION_S` | 480 | Hard cap on audience scenario (failsafe) |

For a realistic 7-question event with 200 people and ~45s per question, the test runs for roughly 5–6 minutes total.
