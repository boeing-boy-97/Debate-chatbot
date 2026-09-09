// Local development server: loads frontend/server/.env, then serves the Express app.
//
// On Vercel this file is not used — the per-route serverless functions in
// frontend/api/ (which share frontend/server/lambda.js) serve the API there.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import app from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load frontend/server/.env no matter which directory the server is started from.
dotenv.config({ path: path.resolve(__dirname, '.env') });

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Debate AI backend running at http://localhost:${PORT}`);
});
