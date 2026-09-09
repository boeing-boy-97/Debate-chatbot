// POST /api/debate/message — sends the user's argument, returns a counterargument.
import { debateHandler } from '../../server/lambda.js';
import { sendDebateMessage } from '../../server/services/aiService.js';

export default debateHandler(sendDebateMessage);
