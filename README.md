# MyMusic

An AI song generator. Describe a song in plain English (or write your own lyrics
and style in custom mode) and get back streamable, downloadable tracks —
powered by the [SunoAPI.org](https://docs.sunoapi.org/) API.

## How it works

- **Frontend** (`public/`): a static HTML/CSS/JS page — no build step, no
  framework. It posts your prompt to a serverless function, then polls for
  results and renders audio players as tracks finish rendering.
- **Backend** (`netlify/functions/`): Netlify Functions that proxy requests to
  SunoAPI.org. Your SunoAPI key lives only in a server-side environment
  variable — it is never sent to the browser.
  - `generate.js` — starts a generation task (`POST /api/v1/generate`)
  - `status.js` — polls task status/results (`GET /api/v1/generate/record-info`)
  - `credits.js` — reads your remaining SunoAPI credit balance
  - `callback.js` — acknowledges SunoAPI's webhook callback (the UI polls
    `status.js` instead of relying on the callback, so this just returns 200)

## Deploying on Netlify

1. Push this repo to GitHub (already done) and connect the repo in Netlify.
2. Netlify will auto-detect `netlify.toml` (publish dir `public`, functions
   dir `netlify/functions`) — no build command is needed.
3. In **Site settings → Environment variables**, add:
   - `SUNO_API_KEY` = your SunoAPI.org API key (get one at
     https://sunoapi.org/api-key)
4. Deploy. That's it — the functions pick up the key at request time.

**Important:** never commit your API key to the repo. It only belongs in
Netlify's environment variables (or a local `.env` file, which is gitignored,
for `netlify dev`).

## Local development

```bash
npm install -g netlify-cli   # if you don't have it
cp .env.example .env         # then fill in SUNO_API_KEY
netlify dev
```

`netlify dev` serves the static site and runs the functions locally with your
`.env` values.

## Notes

- Generation is asynchronous: SunoAPI queues the task and the UI polls every
  5 seconds until tracks are ready (usually well under a minute, depending on
  model and load).
- Generated audio files are hosted by SunoAPI.org for about 15 days — download
  tracks you want to keep.
- "Custom mode" unlocks title, exact lyrics, style/genre text, vocal gender,
  and excluded styles. Off, SunoAPI will write lyrics and pick a style for you
  from the prompt alone.
