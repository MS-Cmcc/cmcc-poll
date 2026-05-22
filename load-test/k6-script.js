// Load test for cmcc-poll — simulates ~200 audience participants
// while a controller VU drives session progression like a real presenter.
//
// Env vars (required):
//   BASE_URL      e.g. https://cmcc-poll.vercel.app
//   ADMIN_CODE    the admin code configured on the deployment
//
// Env vars (optional):
//   VUS                    default 200
//   QUESTION_DURATION_S    seconds the controller waits between "next"  (default 45)
//   RAMP_UP_S              seconds over which audience trickles in       (default 30)
//   AUDIENCE_DURATION_S    hard cap for audience scenario                (default 480 = 8m)
//
// Run locally:
//   BASE_URL=https://cmcc-poll.vercel.app ADMIN_CODE=xxx k6 run k6-script.js
//
// Run a smaller smoke test (10 users, faster):
//   BASE_URL=... ADMIN_CODE=... VUS=10 QUESTION_DURATION_S=15 k6 run k6-script.js

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";
import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

const BASE_URL = __ENV.BASE_URL;
const ADMIN_CODE = __ENV.ADMIN_CODE;
const VUS = parseInt(__ENV.VUS || "200", 10);
const QUESTION_DURATION_S = parseInt(__ENV.QUESTION_DURATION_S || "45", 10);
const RAMP_UP_S = parseInt(__ENV.RAMP_UP_S || "30", 10);
const AUDIENCE_DURATION_S = parseInt(__ENV.AUDIENCE_DURATION_S || "480", 10);

if (!BASE_URL || !ADMIN_CODE) {
  throw new Error("BASE_URL and ADMIN_CODE env vars are required");
}

// Custom metrics for endpoint-level latency
const stateLatency = new Trend("latency_state", true);
const voteLatency = new Trend("latency_vote", true);
const joinLatency = new Trend("latency_join", true);
const votesSubmitted = new Counter("votes_submitted");
const votesRejected = new Counter("votes_rejected");

export const options = {
  scenarios: {
    audience: {
      executor: "per-vu-iterations",
      exec: "audience",
      vus: VUS,
      iterations: 1,
      maxDuration: `${AUDIENCE_DURATION_S}s`,
      gracefulStop: "30s",
    },
    controller: {
      executor: "per-vu-iterations",
      exec: "controller",
      vus: 1,
      iterations: 1,
      maxDuration: `${AUDIENCE_DURATION_S}s`,
      startTime: `${RAMP_UP_S}s`, // wait for audience to ramp up before advancing
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"], // less than 5% failures overall
    "latency_state": ["p(95)<800"], // p95 of /state under 800ms
    "latency_vote": ["p(95)<1500"], // p95 of /vote under 1.5s
    "latency_join": ["p(95)<2000"], // p95 of join flow under 2s
  },
  summaryTrendStats: ["min", "avg", "med", "p(90)", "p(95)", "p(99)", "max"],
};

// ---------- WORD POOLS for realistic random content ----------

const WORDS = [
  "automation", "summarization", "literature", "drafting", "coding",
  "review", "analysis", "synthesis", "citation", "translation",
  "exploration", "ideation", "structure", "feedback", "debugging",
  "clarity", "speed", "focus", "insight", "rigor",
  "reproducibility", "creativity", "documentation", "search", "outline",
];

const SENTENCES = [
  "Finding the right papers in a sea of literature takes hours every week.",
  "Drafting structured sections from rough notes is slow and repetitive.",
  "Reproducing methods from papers without enough detail is painful.",
  "Cleaning and tagging datasets eats into my real research time.",
  "Code review and debugging eat the time I should spend on experiments.",
  "Translating across domains and jargons slows down collaboration.",
  "Keeping notes organized and searchable is harder than it should be.",
  "Onboarding to a new codebase or dataset takes weeks.",
];

// ---------- helpers ----------

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sampleN(poolSize, n) {
  const set = new Set();
  while (set.size < n) set.add(randInt(0, poolSize - 1));
  return [...set];
}

function sampleWords(n) {
  const idx = sampleN(WORDS.length, n);
  return idx.map((i) => WORDS[i]);
}

function sampleSentence() {
  return SENTENCES[randInt(0, SENTENCES.length - 1)];
}

// Build a vote payload appropriate for the given question.
// Works dynamically against any questions.md.
function voteValueFor(question) {
  switch (question.type) {
    case "single_choice":
      return { option_index: randInt(0, question.options.length - 1) };

    case "multiple_choice": {
      const maxPicks = Math.min(3, question.options.length);
      const n = randInt(1, maxPicks);
      return { option_indices: sampleN(question.options.length, n).sort((a, b) => a - b) };
    }

    case "scale":
      return { value: randInt(question.min, question.max) };

    case "word_cloud": {
      const cap = question.max_words ?? 3;
      const n = randInt(1, Math.min(cap, 3));
      return { words: sampleWords(n) };
    }

    case "open_ended":
      return { text: sampleSentence() };

    default:
      throw new Error(`Unknown question type: ${question.type}`);
  }
}

// ---------- setup: create a fresh session ----------

export function setup() {
  console.log(`Creating session against ${BASE_URL} ...`);
  const res = http.post(`${BASE_URL}/api/admin/sessions`, null, {
    headers: { "X-Admin-Code": ADMIN_CODE },
    tags: { endpoint: "admin_create" },
  });

  if (res.status !== 201) {
    throw new Error(`Failed to create session: ${res.status} ${res.body}`);
  }

  const session = res.json("session");
  console.log("=".repeat(60));
  console.log(`SESSION CREATED`);
  console.log(`  code:        ${session.code}`);
  console.log(`  id:          ${session.id}`);
  console.log(`  join URL:    ${BASE_URL}/s/${session.code}`);
  console.log("=".repeat(60));

  return { sessionId: session.id, code: session.code };
}

// ---------- audience scenario: simulate one participant ----------

export function audience(data) {
  // Staggered ramp-up: each VU waits a random fraction of RAMP_UP_S before joining
  sleep(Math.random() * RAMP_UP_S);

  // Step 1: resolve session by code
  const byCodeRes = http.get(`${BASE_URL}/api/sessions/by-code/${data.code}`, {
    tags: { endpoint: "by_code" },
  });
  joinLatency.add(byCodeRes.timings.duration);

  if (
    !check(byCodeRes, {
      "by-code 200": (r) => r.status === 200,
    })
  ) {
    console.error(`[audience] by-code failed: ${byCodeRes.status}`);
    return;
  }
  const sessionId = byCodeRes.json("sessionId");

  // Step 2: join as participant
  const clientToken = uuidv4();
  const joinRes = http.post(
    `${BASE_URL}/api/sessions/${sessionId}/participants`,
    JSON.stringify({ clientToken }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "join" },
    }
  );
  joinLatency.add(joinRes.timings.duration);

  if (
    !check(joinRes, {
      "join 200": (r) => r.status === 200,
    })
  ) {
    console.error(`[audience] join failed: ${joinRes.status} ${joinRes.body}`);
    return;
  }
  const participantId = joinRes.json("participantId");

  // Step 3: polling + voting loop
  let lastVotedIndex = -1;
  const startMs = Date.now();
  const maxMs = AUDIENCE_DURATION_S * 1000;

  while (Date.now() - startMs < maxMs) {
    const stateRes = http.get(`${BASE_URL}/api/sessions/${sessionId}/state`, {
      tags: { endpoint: "state" },
    });
    stateLatency.add(stateRes.timings.duration);

    if (stateRes.status !== 200) {
      sleep(2);
      continue;
    }

    const state = stateRes.json();

    if (state.status === "ended") {
      break;
    }

    const currentIdx = state.currentQuestionIndex;
    const currentQuestion = state.currentQuestion;

    if (currentQuestion && currentIdx > lastVotedIndex) {
      // New question detected — simulate human "think time" before voting
      const thinkTime = 3 + Math.random() * 12; // 3 to 15 seconds
      sleep(thinkTime);

      // Re-check state in case the presenter advanced again while we were thinking
      const recheckRes = http.get(`${BASE_URL}/api/sessions/${sessionId}/state`, {
        tags: { endpoint: "state" },
      });
      stateLatency.add(recheckRes.timings.duration);
      if (recheckRes.status !== 200) {
        sleep(2);
        continue;
      }
      const freshState = recheckRes.json();
      if (freshState.status === "ended") break;

      const voteIdx = freshState.currentQuestionIndex;
      const voteQuestion = freshState.currentQuestion;
      if (!voteQuestion) {
        sleep(2);
        continue;
      }

      let value;
      try {
        value = voteValueFor(voteQuestion);
      } catch (e) {
        console.error(`[audience] could not build vote: ${e.message}`);
        lastVotedIndex = voteIdx;
        sleep(2);
        continue;
      }

      const voteRes = http.post(
        `${BASE_URL}/api/sessions/${sessionId}/votes`,
        JSON.stringify({
          participantId,
          questionIndex: voteIdx,
          value,
        }),
        {
          headers: { "Content-Type": "application/json" },
          tags: { endpoint: "vote" },
        }
      );
      voteLatency.add(voteRes.timings.duration);

      const accepted = voteRes.status === 201;
      const alreadyVoted = voteRes.status === 409;

      check(voteRes, {
        "vote accepted or already voted": (r) => r.status === 201 || r.status === 409,
      });

      if (accepted) votesSubmitted.add(1);
      if (!accepted && !alreadyVoted) {
        votesRejected.add(1);
        console.warn(
          `[audience] vote rejected idx=${voteIdx} type=${voteQuestion.type} status=${voteRes.status} body=${voteRes.body}`
        );
      }

      lastVotedIndex = voteIdx;
    }

    sleep(2); // polling interval — mirrors audience client behavior
  }
}

// ---------- controller scenario: act as the presenter ----------

export function controller(data) {
  const sessionId = data.sessionId;
  console.log(`[controller] starting — sessionId=${sessionId}`);

  // We don't know question count in advance (depends on questions.md).
  // Strategy: query state once to find totalQuestions, then advance N-1 times.
  const initRes = http.get(`${BASE_URL}/api/sessions/${sessionId}/state`, {
    tags: { endpoint: "state" },
  });
  if (initRes.status !== 200) {
    console.error(`[controller] could not read initial state: ${initRes.status}`);
    return;
  }
  const total = initRes.json("totalQuestions");
  console.log(`[controller] total questions: ${total}`);

  for (let i = 0; i < total - 1; i++) {
    sleep(QUESTION_DURATION_S);
    const res = http.patch(
      `${BASE_URL}/api/admin/sessions/${sessionId}`,
      JSON.stringify({ action: "next" }),
      {
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Code": ADMIN_CODE,
        },
        tags: { endpoint: "admin_next" },
      }
    );
    console.log(`[controller] advanced to question ${i + 1}/${total - 1} — status=${res.status}`);
  }

  // Let the audience answer the last question, then end the session
  sleep(QUESTION_DURATION_S);

  const endRes = http.patch(
    `${BASE_URL}/api/admin/sessions/${sessionId}`,
    JSON.stringify({ action: "end" }),
    {
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Code": ADMIN_CODE,
      },
      tags: { endpoint: "admin_end" },
    }
  );
  console.log(`[controller] session ended — status=${endRes.status}`);
}

// ---------- teardown: ensure session is closed even on failure ----------

export function teardown(data) {
  if (!data || !data.sessionId) return;
  http.patch(
    `${BASE_URL}/api/admin/sessions/${data.sessionId}`,
    JSON.stringify({ action: "end" }),
    {
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Code": ADMIN_CODE,
      },
      tags: { endpoint: "admin_end" },
    }
  );
}
