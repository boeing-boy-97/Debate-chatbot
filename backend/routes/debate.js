import { Router } from 'express';
import {
  ApiError,
  startDebate,
  sendDebateMessage,
  analyzeDebateArgument,
  evaluateDebateTurn,
} from '../services/aiService.js';

const router = Router();

// Wrap handlers so thrown errors become friendly JSON responses.
const handle = (fn) => async (req, res, next) => {
  try {
    const data = await fn(req.body);
    res.json(data);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    // Log the technical detail server-side only.
    console.error('[api error]', error);
    return res.status(500).json({
      error: 'Something went wrong while contacting the AI. Please try again.',
    });
  }
};

// POST /api/debate/start — starts a debate and returns the AI opening statement.
router.post('/start', handle(async (body) => startDebate(body)));

// POST /api/debate/message — sends the user's latest argument, returns a counterargument.
router.post('/message', handle(async (body) => sendDebateMessage(body)));

// POST /api/debate/analyze — analyzes the user's latest argument.
router.post('/analyze', handle(async (body) => analyzeDebateArgument(body)));

// POST /api/debate/evaluate — evaluates the complete debate.
router.post('/evaluate', handle(async (body) => evaluateDebateTurn(body)));

export default router;
