import { Router } from 'express';
import {
  ApiError,
  generateOpening,
  generateCounterargument,
  analyzeArgument,
  evaluateDebate,
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
router.post(
  '/start',
  handle(async (body) => ({
    reply: await generateOpening({
      topic: body.topic,
      userPosition: body.userPosition,
      difficulty: body.difficulty,
    }),
  }))
);

// POST /api/debate/message — sends the user's latest argument, returns a counterargument.
router.post(
  '/message',
  handle(async (body) => ({
    reply: await generateCounterargument({
      topic: body.topic,
      userPosition: body.userPosition,
      aiPosition: body.aiPosition,
      difficulty: body.difficulty,
      conversation: body.conversation,
    }),
  }))
);

// POST /api/debate/analyze — analyzes the user's latest argument.
router.post(
  '/analyze',
  handle(async (body) => ({
    analysis: await analyzeArgument({
      topic: body.topic,
      userPosition: body.userPosition,
      difficulty: body.difficulty,
      argument: body.argument,
      lastAiResponse: body.lastAiResponse,
    }),
  }))
);

// POST /api/debate/evaluate — evaluates the complete debate.
router.post(
  '/evaluate',
  handle(async (body) => ({
    evaluation: await evaluateDebate({
      topic: body.topic,
      userPosition: body.userPosition,
      aiPosition: body.aiPosition,
      difficulty: body.difficulty,
      conversation: body.conversation,
    }),
  }))
);

export default router;
