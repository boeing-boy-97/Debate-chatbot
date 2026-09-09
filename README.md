# Debate AI

**Think. Argue. Improve.**

Debate AI is a web application where you enter a debate topic, choose a side, and debate an AI opponent that automatically takes the opposite side. The AI remembers the whole conversation, challenges your reasoning, analyzes your arguments, and evaluates the debate when you end it.

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **AI:** OpenAI API (kept on the backend only)
- **Storage:** Browser localStorage (debate history)

## Project Structure

```
debate-ai/
├── backend/
│   ├── server.js
│   ├── routes/debate.js
│   ├── services/aiService.js
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   ├── index.html
│   └── vite.config.js
├── package.json
└── README.md
```

## 1. Install Dependencies

From the project root:

```bash
npm install
```

This installs the frontend, backend, and root tooling (npm workspaces).

## 2. Configure the API Key

The API key is used **only** by the backend. Never put it in frontend code.

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and set your key:

```
OPENAI_API_KEY=sk-your-key-here
```

Optional settings (also shown in `.env.example`):

```
OPENAI_MODEL=gpt-4o-mini     # default model
OPENAI_BASE_URL=             # only if you use an OpenAI-compatible proxy
PORT=3001                    # backend port
```

`.env` is already in `.gitignore`, so your key will never be committed.

## 3. Start the Backend

From the project root:

```bash
npm run dev:backend
```

The API runs at `http://localhost:3001`. Health check: `GET http://localhost:3001/api/health`.

## 4. Start the Frontend

In a second terminal, from the project root:

```bash
npm run dev:frontend
```

Open `http://localhost:5173`. Vite proxies `/api` requests to the backend, so no CORS setup is needed.

**Or run both together** with one command:

```bash
npm run dev
```

## 5. How to Use the Application

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
npm run test --workspace frontend
```

## API Endpoints

| Endpoint | Purpose |
| --- | --- |
| `POST /api/debate/start` | Start a debate; returns the AI opening statement |
| `POST /api/debate/message` | Send the latest argument; returns the counterargument, reasoning, and challenge |
| `POST /api/debate/analyze` | Analyze the user's latest argument |
| `POST /api/debate/evaluate` | Evaluate the full debate |

All endpoints accept JSON bodies and return friendly error messages. If no API key is configured, the app shows *"AI service is not configured."*
