# Debate AI

**Think. Argue. Improve.**

Debate AI is a web application where you enter a debate topic, choose a side, and debate an AI opponent that automatically takes the opposite side. The AI remembers the whole conversation, challenges your reasoning, analyzes your arguments, and evaluates the debate when you end it.

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express (deployable as a Vercel serverless function)
- **AI:** OpenAI API (kept on the backend only)
- **Storage:** Browser localStorage (debate history)

## Project Structure

```
debate-ai/
├── api/
│   └── index.js          # Vercel serverless function entry (imports the Express app)
├── backend/
│   ├── app.js            # Express app (shared by local dev + Vercel)
│   ├── server.js         # Local dev server (loads .env, app.listen)
│   ├── routes/debate.js
│   ├── services/aiService.js
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   ├── index.html
│   └── vite.config.js    # Dev proxy: /api → localhost:3001
├── vercel.json           # Vercel build + routing configuration
├── package.json          # npm workspaces (frontend + backend)
└── README.md
```

## Deploy to Vercel

The project is **Vercel-ready** — `vercel.json` already configures the build,
the static frontend output, and the `/api/*` routing to the serverless
function. No extra setup is needed beyond adding your API key.

1. **Push this repository to GitHub.**

2. **Import it on Vercel:** go to [vercel.com/new](https://vercel.com/new) and
   import the repository.

3. **Keep the Root Directory as the repository root** (leave it empty /
   default). Do **not** set it to `frontend/` — the whole monorepo is needed
   because the API function lives in `api/`.

4. **Framework Preset:** *Other* — `vercel.json` already sets the build
   command (`npm run build`) and output directory (`frontend/dist`).

5. **Add the environment variable** (required):

   | Name | Value |
   | --- | --- |
   | `OPENAI_API_KEY` | your OpenAI API key (e.g. `sk-...`) |

   Optional variables:

   | Name | Value |
   | --- | --- |
   | `OPENAI_MODEL` | model to use (default: `gpt-4o-mini`) |
   | `OPENAI_BASE_URL` | only if you use an OpenAI-compatible proxy |
   | `ALLOW_OFFLINE_FALLBACK` | default `true`; when the AI service is unreachable or no key is set, the app falls back to a local demo engine so it still works end-to-end. Set to `false` to enforce OpenAI-only. |

   Add them to **Production** (and **Preview** if you want preview
   deployments to work too).

6. **Deploy.** Then verify the API is live:
   `https://<your-deployment>.vercel.app/api/health` should return
   `{"status":"ok"}`.

Notes:

- Vercel serverless functions are limited to 60 seconds on the Hobby plan
  (300s on Pro). The app's AI calls normally take 3–15 seconds, and the
  OpenAI client is configured with a 20s timeout and a single retry, so the
  worst case (~45s) stays below the limit and returns a friendly error
  instead of a platform 504.
- The OpenAI API key is only ever read on the server (the serverless
  function) — it is never exposed to the browser.

## How the AI replies work

The backend first tries to use **real OpenAI**. If that succeeds, the debate is
driven by the model.

When OpenAI is **not configured** (no key) or **can't be reached** (no network
to `api.openai.com`, an outage, or a rate/invalid-key error), the app falls back
to a small **local demo engine** (`backend/services/offlineEngine.js`) so the
full product still works end-to-end and can be demonstrated anywhere. Replies
produced this way are clearly labelled **"Offline replies"** in the UI.

Every response (real or fallback) includes a `mode` field — `"online"` or
`"offline"` — so the client knows which path was used.

To run strictly on OpenAI and never fall back, set `ALLOW_OFFLINE_FALLBACK=false`.

> The offline engine is a deterministic, heuristic debater — it is not real AI.
> For genuine, high-quality debates, run with an `OPENAI_API_KEY` on a machine
> or deployment that has internet access to `api.openai.com`.

## Local Development

### 1. Install Dependencies

From the project root:

```bash
npm install
```

This installs the frontend, backend, and root tooling (npm workspaces).

### 2. Configure the API Key

The API key is used **only** by the backend. Never put it in frontend code.

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and set your key:

```
OPENAI_API_KEY=sk-your-key-here
```

(There is also a root [`.env.example`](.env.example) listing every variable
the app reads — useful as a checklist when configuring Vercel.)

Optional settings (also shown in `.env.example`):

```
OPENAI_MODEL=gpt-4o-mini     # default model
OPENAI_BASE_URL=             # only if you use an OpenAI-compatible proxy
PORT=3001                    # backend port
```

`.env` is already in `.gitignore`, so your key will never be committed.

### 3. Start the Backend

From the project root:

```bash
npm run dev:backend
```

The API runs at `http://localhost:3001`. Health check: `GET http://localhost:3001/api/health`.

### 4. Start the Frontend

In a second terminal, from the project root:

```bash
npm run dev:frontend
```

Open `http://localhost:5173`. Vite proxies `/api` requests to the backend, so no CORS setup is needed.

**Or run both together** with one command:

```bash
npm run dev
```

### 5. How to Use the Application

1. **Home** — click **Start a Debate**.
2. **Setup** — enter a topic (or click the example), choose **FOR** or **AGAINST**, pick a difficulty, and click **Start Debate**.
3. **Debate** — the AI opens the debate; type your arguments and press **Send** (or Enter). The AI responds with a counterargument, its reasoning, and a challenge.
4. **Analyze My Argument** — under each AI reply, analyze the argument you just made. The analysis is shown separately from the debate.
5. **End Debate** — get a full evaluation: overall score, six category scores, winner ("You won" / "AI won" / "Too close to call"), strongest/weakest argument, and improvement tips.
6. **Results** — click **Save to History** to store the debate in your browser.
7. **History** — the home page lists previous debates (topic, position, date, score, result). Click one to reopen the full transcript, or delete individual entries / all history.

Controls on the debate screen: **Send**, **Debate Score** (provisional evaluation anytime), **End Debate** (finish + final evaluation), **Restart** (new debate setup with your previous choices pre-filled), **Clear Chat** (start the same debate over).

## Running the Tests

The repository includes an end-to-end smoke test of the whole UI flow (with the network mocked):

```bash
npm test
```

## API Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Health check |
| `POST /api/debate/start` | Start a debate; returns the AI opening statement |
| `POST /api/debate/message` | Send the latest argument; returns the counterargument, reasoning, and challenge |
| `POST /api/debate/analyze` | Analyze the user's latest argument |
| `POST /api/debate/evaluate` | Evaluate the full debate |

All endpoints accept JSON bodies and return friendly error messages. If no API key is configured, the app shows *"AI service is not configured."*
