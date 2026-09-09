import { describe, it, expect } from 'vitest';
import { validateDebateArgument } from './services/validateArgument.js';

describe('validateDebateArgument', () => {
  it('rejects trivial greetings and non-arguments', () => {
    const invalidInputs = [
      'hi',
      'hello',
      'hey',
      'heyy',
      'yo',
      'sup',
      'ok',
      'okay',
      'k',
      'yes',
      'no',
      'thanks',
      'thank you',
      'hmm',
      'hm',
      '👍',
      'test',
      'testing',
      'asdf',
      'qwerty',
      'hello world',
      'ok ok ok',
      'who are you',
      'what is your name',
    ];

    for (const input of invalidInputs) {
      const res = validateDebateArgument(input);
      expect(res.valid).toBe(false);
      expect(res.reason).toBe(
        "That's not yet a debate argument. Please make a claim related to the topic."
      );
    }
  });

  it('accepts legitimate short debate arguments', () => {
    const validInputs = [
      'Free speech should be protected.',
      'Taxation is theft.',
      'Nuclear energy is safe and clean.',
      'School uniforms reduce social pressure.',
      'Social media platforms should not be legally responsible for user content.',
    ];

    for (const input of validInputs) {
      const res = validateDebateArgument(input);
      expect(res.valid).toBe(true);
    }
  });
});
