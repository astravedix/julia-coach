# Her Coach — Julia's Chart-Grounded AI Coach

A small chat app: a coaching assistant grounded in Julia's full astrological
and design profile, with persistent memory across conversations. Built for
Netlify (static frontend + serverless Functions + Netlify Blobs for
storage).

## What's in here

```
julia-coach/
├── netlify.toml              # Netlify build/routing config
├── package.json              # dependencies (@netlify/blobs)
├── public/
│   └── index.html            # the full document — all 7 tabs, including Her Coach,
│                               plus the "Current Outlook" banner shown on every tab
└── netlify/functions/
    ├── chat.js                # main chat endpoint + memory logic
    ├── reset.js                # clears stored memory (optional utility)
    ├── profile.js              # Julia's condensed profile (the "grounding" data)
    ├── periods.js              # shared vigilance-period data (banner + digests use this)
    ├── eras.js                  # deep-current/era context data (monthly digest uses this)
    ├── weekly-digest.js        # scheduled function: weekly email — current period, close-up
    └── monthly-digest.js        # scheduled function: monthly email — zoomed-out, era + upcoming shifts
```

## What's new: two distinct emails, not one repeated

- **Weekly** (`weekly-digest.js`, every Monday 13:00 UTC): close-up — current
  period, a couple of grounding sentences specific to it.
- **Monthly** (`monthly-digest.js`, the 1st of each month, 13:00 UTC):
  zoomed-out — which Berklee year and which deep current (Mahadasha/
  Antardasha era) she's in, what the *current* vigilance level actually
  means within that specific era (not the generic version), and any
  vigilance-level shifts coming in the next 30 days, flagged in advance.

Both use the same `RESEND_API_KEY` / `JULIA_EMAIL` / `RESEND_FROM`
environment variables — no extra setup beyond what's already needed for the
weekly one.
## What's new: notifications

Two layers, both already wired in:

- **In-app banner** ("Current Outlook") — appears above the tabs on every page
  load, computed client-side from the same period data used in the Berklee
  Years tab. No setup required, works as soon as the site is deployed.
- **Weekly email digest** — a Netlify Scheduled Function (`weekly-digest.js`)
  runs automatically every **Monday at 13:00 UTC**, figures out her current
  period, asks Claude for two short grounding sentences specific to that
  period, and emails the whole thing to her via **Resend**. Requires two
  more environment variables (see below) — nothing else to configure,
  Netlify handles the scheduling once the function is deployed.

To change the schedule, edit the cron string at the bottom of
`weekly-digest.js` (`exports.config = { schedule: "0 13 * * 1" }`) —
e.g. `"0 13 1 * *"` would run once a month, on the 1st.

## How it works

1. Julia sends a message from the browser to `/api/chat`.
2. The function loads her stored conversation memory (a running summary +
   the last ~24 messages) from **Netlify Blobs**.
3. It builds a system prompt: her full profile (`profile.js`) + the running
   summary of older conversation + recent messages, and calls the Claude
   API.
4. The reply is saved back into memory, and once the recent-message list
   grows past the cap, the oldest chunk gets summarized into the running
   summary — so conversations can go on indefinitely without the context
   (and the API cost) growing without bound.

## Setup

### 1. Get an Anthropic API key
Create one at [console.anthropic.com](https://console.anthropic.com). This
is a **paid, per-message** API — budget accordingly. Consider setting a
spend cap in the Anthropic console.

### 2. Deploy to Netlify
- Push this folder to a GitHub repo (or drag-and-drop deploy via the
  Netlify dashboard).
- In Netlify: **Add new site → Import an existing project**, point it at
  the repo.
- Build settings should auto-detect from `netlify.toml` — no build command
  needed, it's static + functions.

### 3. Enable Netlify Blobs
Blobs are available automatically on Netlify sites — no extra setup step,
`@netlify/blobs` just works once deployed (it also works locally via
`netlify dev`, see below).

### 4. Set environment variables
In Netlify: **Site configuration → Environment variables**, add:

| Key | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your API key from step 1 |
| `COACH_PASSPHRASE` | any passphrase Julia will enter to use the app |
| `RESEND_API_KEY` | from resend.com — free tier, needed for the weekly email |
| `JULIA_EMAIL` | the email address the weekly digest gets sent to |
| `RESEND_FROM` | *(optional)* defaults to `onboarding@resend.dev`, which works with zero setup for personal use |

**Getting the Resend key**: sign up free at [resend.com](https://resend.com),
go to **API Keys**, create one, paste it in as `RESEND_API_KEY`. No domain
verification needed if you leave `RESEND_FROM` unset — Resend's shared
test address works fine for a personal digest like this.

The passphrase exists so a random visitor with the URL can't run up your
API bill — it's not meant to be strong security, just a basic gate. Redeploy
(or trigger a new deploy) after adding env vars.

### 5. Test locally (optional)
```bash
npm install -g netlify-cli
npm install
netlify dev
```
This runs the functions and Blobs storage locally at `http://localhost:8888`.

## Adjusting things later

- **Update her profile**: edit `netlify/functions/profile.js` directly —
  this is the same content structure as the full reference document,
  condensed. Redeploy after changes.
- **Reset her memory**: POST to `/api/reset` with the `x-coach-passphrase`
  header set, or just clear it manually from the Netlify Blobs dashboard
  (Site → Blobs → `julia-coach-memory` store → delete the `memory` key).
- **Change how much history is kept before summarizing**: `HISTORY_CAP` in
  `chat.js` (currently 24 messages).
- **Model**: `MODEL` constant in `chat.js`.

## A few things worth deciding on purpose, not by default

- **This is a support tool, not a substitute for real people.** The system
  prompt already instructs the model to say so plainly if something sounds
  like it needs a real person — worth keeping that instruction intact
  rather than trimming it for "efficiency."
- **Cost**: every message is a real API call. Keep an eye on usage,
  especially once summarization calls (which run automatically once
  history grows) are factored in — that's a second API call every time the
  cap is hit.
- **Single passphrase = single shared session** in this version — everyone
  who has the passphrase shares the same memory store. That's fine for one
  person (Julia); if this ever needs to support more than one user, the
  store key in `chat.js` (`"memory"`) would need to become per-user instead
  of fixed.
