// Vercel serverless function entry point.
//
// vercel.json rewrites every /api/* request to this function, and the Express
// app in backend/app.js routes them (it defines the /api/... paths itself).
// Do NOT call app.listen() here — Vercel manages the server lifecycle.
import app from '../backend/app.js';

export default app;
