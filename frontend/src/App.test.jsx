// End-to-end smoke test of the complete user flow.
// Only the network layer is mocked (fetch) — everything else runs for real:
// Home -> Setup -> Debate -> AI response -> Analyze -> Evaluate -> History.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';

const TOPIC = 'Should AI replace human teachers?';

function mockFetch() {
  const calls = [];
  globalThis.fetch = vi.fn(async (url, options) => {
    const body = JSON.parse(options.body || '{}');
    calls.push(url);
    let payload;
    if (url.endsWith('/start')) {
      payload = { reply: 'Welcome to the debate. I will argue the opposite side.' };
    } else if (url.endsWith('/message')) {
      payload = {
        reply: {
          counterargument: 'Availability does not mean better education.',
          why: 'Teachers also handle motivation and social development.',
          challenge: 'How can AI observe a student emotional state?',
        },
      };
    } else if (url.endsWith('/analyze')) {
      payload = {
        analysis: {
          score: 7,
          logic: 'Clear reasoning that rests on an assumption.',
          evidence: 'Missing evidence for the central claim.',
          weakness: 'It assumes availability equals quality.',
          improvement: 'Add a concrete example and address the counterargument.',
        },
      };
    } else if (url.endsWith('/evaluate')) {
      payload = {
        evaluation: {
          overallScore: 78,
          userScore: 72,
          aiScore: 80,
          scores: {
            argumentQuality: 74,
            logicalReasoning: 70,
            evidence: 60,
            rebuttalQuality: 78,
            consistency: 85,
            persuasiveness: 76,
          },
          winner: 'tie',
          explanation: 'Both sides argued well; the user lacked evidence.',
          strongestArgument: 'The availability argument.',
          weakestArgument: 'The claim that teachers are unnecessary.',
          improvementTips: ['Add evidence.', 'Address challenges.', 'Stay consistent.'],
        },
      };
    } else {
      payload = { error: 'Not found' };
    }
    return {
      ok: true,
      status: 200,
      json: async () => payload,
    };
  });
  return calls;
}

describe('Debate AI full flow', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch();
  });

  it('walks Home -> Setup -> Debate -> Analyze -> Evaluate -> History', async () => {
    const user = userEvent.setup();

    // Home
    render(<App />);
    expect(screen.getByRole('heading', { name: /Debate AI/i })).toBeTruthy();
    expect(screen.getByText('Think. Argue. Improve.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Start a Debate/i }));

    // Setup
    const topicInput = screen.getByLabelText(/Debate Topic/i);
    await user.type(topicInput, TOPIC);
    await user.click(screen.getByRole('button', { name: /^FOR/i }));
    await user.click(screen.getByRole('button', { name: /Start Debate/i }));

    // Debate: AI opening arrives
    await waitFor(() =>
      expect(screen.getByText(/Welcome to the debate/i)).toBeTruthy()
    );
    expect(screen.getByText(/You: FOR/i)).toBeTruthy();
    expect(screen.getByText(/AI: AGAINST/i)).toBeTruthy();

    // Send an argument
    await user.type(
      screen.getByPlaceholderText(/Type your argument/i),
      'AI can teach students 24/7, so human teachers are unnecessary.'
    );
    expect(screen.getByPlaceholderText(/Type your argument/i)).toHaveProperty('value', 'AI can teach students 24/7, so human teachers are unnecessary.');
    await user.click(screen.getByRole('button', { name: /Send/i }));

    // AI counterargument appears
    await waitFor(() =>
      expect(screen.getByText('Availability does not mean better education.')).toBeTruthy()
    );
    expect(screen.getByText('How can AI observe a student emotional state?')).toBeTruthy();

    // Analyze the argument
    await user.click(screen.getByRole('button', { name: /Analyze My Argument/i }));
    await waitFor(() => expect(screen.getByText('Argument Analysis')).toBeTruthy());
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText(/Add a concrete example/i)).toBeTruthy();

    // Provisional score
    await user.click(screen.getByRole('button', { name: /Debate Score/i }));
    await waitFor(() => expect(screen.getByText('Debate Results')).toBeTruthy());

    // End the debate (final evaluation)
    await user.click(screen.getByRole('button', { name: /End Debate/i }));
    await waitFor(() => expect(screen.getByText(/Debate ended/i)).toBeTruthy());
    expect(screen.getByText('Too close to call')).toBeTruthy();
    expect(screen.getByText(/The availability argument/)).toBeTruthy();
    expect(screen.getByText('Add evidence.')).toBeTruthy();

    // Save to history
    await user.click(screen.getByRole('button', { name: /Save to History/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Saved to History/i })).toBeTruthy()
    );

    // Back home: history shows the saved debate
    await user.click(screen.getByRole('button', { name: /Back to Home/i }));
    expect(screen.getByText('Previous Debates')).toBeTruthy();
    expect(screen.getByText(TOPIC)).toBeTruthy();
    expect(screen.getByText(/Score 78\/100/)).toBeTruthy();

    // Open the saved debate from history
    await user.click(screen.getByText(TOPIC));
    await waitFor(() =>
      expect(screen.getByText('Availability does not mean better education.')).toBeTruthy()
    );
    expect(screen.getByText('Debate Results')).toBeTruthy();

    // Back home and delete the history entry (two clicks to confirm)
    await user.click(screen.getByRole('button', { name: 'Go to home page' }));
    await user.click(screen.getByRole('button', { name: 'Delete debate entry' }));
    await user.click(screen.getByRole('button', { name: 'Delete debate entry' }));
    await waitFor(() => expect(screen.getByText(/No debates yet/i)).toBeTruthy());
  });

  it('blocks empty arguments and shows a friendly error', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Start a Debate/i }));
    await user.type(screen.getByLabelText(/Debate Topic/i), TOPIC);
    await user.click(screen.getByRole('button', { name: /^FOR/i }));
    await user.click(screen.getByRole('button', { name: /Start Debate/i }));
    await waitFor(() => expect(screen.getByText(/Welcome to the debate/i)).toBeTruthy());

    await user.click(screen.getByRole('button', { name: /Send/i }));
    expect(screen.getByText('Please enter an argument first.')).toBeTruthy();
  });
});
