// POST /api/debate/evaluate — evaluates the complete debate.
import { debateHandler } from '../../server/lambda.js';
import { evaluateDebateTurn } from '../../server/services/aiService.js';

export default debateHandler(evaluateDebateTurn);
