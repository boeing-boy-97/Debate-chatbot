/**
 * Validates whether user text is a meaningful debate argument vs a greeting/casual input/non-argument.
 * Returns { valid: boolean, reason?: string }
 */
export function validateDebateArgument(input) {
  if (typeof input !== 'string') {
    return {
      valid: false,
      reason: "That's not yet a debate argument. Please make a claim related to the topic.",
    };
  }

  const raw = input.trim();
  if (!raw) {
    return { valid: false, reason: 'Please enter an argument first.' };
  }

  // Normalize: remove non-alphanumeric except spaces, convert to lowercase
  const normalized = raw
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Exact non-argument words or short phrases
  const INVALID_EXACT = new Set([
    'hi',
    'hello',
    'hey',
    'heyy',
    'heya',
    'yo',
    'sup',
    'greetings',
    'good morning',
    'good afternoon',
    'good evening',
    'ok',
    'okay',
    'k',
    'kk',
    'sure',
    'fine',
    'alright',
    'yes',
    'no',
    'yeah',
    'yep',
    'nope',
    'nah',
    'thanks',
    'thank you',
    'thx',
    'ty',
    'cool',
    'nice',
    'great',
    'awesome',
    'lol',
    'lmao',
    'rofl',
    'hmm',
    'hm',
    'uh',
    'um',
    'ah',
    'oh',
    'idk',
    'idc',
    'whatever',
    'test',
    'testing',
    'asdf',
    'qwerty',
    'agree',
    'disagree',
    'i agree',
    'i disagree',
    'true',
    'false',
    'right',
    'wrong',
    'who are you',
    'what is your name',
    'how are you',
    'are you ai',
    'tell me a joke',
    'help',
    'hello world',
  ]);

  if (INVALID_EXACT.has(normalized)) {
    return {
      valid: false,
      reason: "That's not yet a debate argument. Please make a claim related to the topic.",
    };
  }

  const cleanWords = normalized.split(/\s+/).filter((w) => w.length > 0);

  // 2. Pure emojis / punctuation / non-word characters
  if (cleanWords.length === 0) {
    return {
      valid: false,
      reason: "That's not yet a debate argument. Please make a claim related to the topic.",
    };
  }

  // 3. Single-word inputs are not complete debate claims
  if (cleanWords.length === 1) {
    return {
      valid: false,
      reason: "That's not yet a debate argument. Please make a claim related to the topic.",
    };
  }

  // 4. Repeated single word or simple phrase (e.g. "hi hi hi", "test test test", "ok ok ok")
  const uniqueWords = new Set(cleanWords);
  if (cleanWords.length > 1 && uniqueWords.size === 1) {
    return {
      valid: false,
      reason: "That's not yet a debate argument. Please make a claim related to the topic.",
    };
  }

  // 5. Two-word or short inputs containing greetings/chitchat words
  const GREETING_WORDS = new Set([
    'hi',
    'hello',
    'hey',
    'yo',
    'sup',
    'ok',
    'okay',
    'thanks',
    'test',
    'testing',
    'bye',
    'goodbye',
    'greetings',
    'welcome',
    'who',
    'what',
  ]);

  if (cleanWords.length === 2) {
    const combined = cleanWords.join(' ');
    if (
      INVALID_EXACT.has(combined) ||
      cleanWords.some((w) => GREETING_WORDS.has(w))
    ) {
      return {
        valid: false,
        reason: "That's not yet a debate argument. Please make a claim related to the topic.",
      };
    }
  }

  // 6. Minimum character count check for meaningful input (excluding spaces/punctuation)
  const lettersOnly = raw.replace(/[^a-zA-Z0-9]/g, '');
  if (lettersOnly.length < 8) {
    return {
      valid: false,
      reason: "That's not yet a debate argument. Please make a claim related to the topic.",
    };
  }

  return { valid: true };
}
