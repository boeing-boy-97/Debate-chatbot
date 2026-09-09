// POST /api/debate/analyze — analyzes the user's latest argument.
import { debateHandler } from '../../server/lambda.js';
import { analyzeDebateArgument } from '../../server/services/aiService.js';

export default debateHandler(analyzeDebateArgument);
