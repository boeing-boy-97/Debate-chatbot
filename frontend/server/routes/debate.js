import { Router } from 'express';
import {
  ApiError,
  startDebate,
  sendDebateMessage,
  analyzeDebateArgument,
  evaluateDebateTurn,
} from '../services/aiService.js';

const router = Router();

const handle = (fn) => async (req, res) => {
  try {
    const data = await fn(req.body);
    res.json(data);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('[api error]', error);
    return res.status(500).json({
      error: 'AI service temporarily unavailable.',
    });
  }
};

// POST /api/debate/start
router.post('/start', handle(async (body) => startDebate(body)));

// POST /api/debate/message
router.post('/message', handle(async (body) => sendDebateMessage(body)));

// POST /api/debate/analyze
router.post('/analyze', handle(async (body) => analyzeDebateArgument(body)));

// POST /api/debate/evaluate
router.post('/evaluate', handle(async (body) => evaluateDebateTurn(body)));

export default router;
