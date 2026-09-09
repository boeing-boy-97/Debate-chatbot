// POST /api/debate/start — starts a debate, returns the AI opening statement.
import { debateHandler } from '../../server/lambda.js';
import { startDebate } from '../../server/services/aiService.js';

export default debateHandler(startDebate);
