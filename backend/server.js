// Local development server: loads backend/.env, then serves the Express app.
//
// On Vercel this file is not used — api/index.js at the repository root is
// the serverless entry point there.
import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Debate AI backend running at http://localhost:${PORT}`);
});
