import { createContext, useContext, useState, useEffect } from 'react';

const ModeContext = createContext();

const MODES = {
  clipboard: {
    id: 'clipboard',
    label: 'Mode A: Open in Claude',
    shortLabel: 'Claude Chat',
    description: 'Copies a crafted prompt with your answer to clipboard and opens Claude. Uses your own Claude account credits.',
    pros: ['Zero cost for the quiz platform', 'No backend infrastructure needed', 'Full conversational follow-up in Claude'],
    cons: ['Requires a Claude account', 'Context switch (leaves the quiz)', 'No analytics on student performance'],
  },
  singleshot: {
    id: 'singleshot',
    label: 'Mode B: Single-Shot Feedback',
    shortLabel: 'Single Feedback',
    description: 'Sends your answer to the AI for evaluation and shows structured feedback inline. One evaluation per question.',
    pros: ['Seamless in-quiz experience', 'Predictable cost (~1 cent per evaluation)', 'Structured, consistent feedback format'],
    cons: ['Requires API key and backend', 'No follow-up questions possible', 'Per-evaluation cost adds up at scale'],
  },
  chat: {
    id: 'chat',
    label: 'Mode C: Interactive Discussion',
    shortLabel: 'Discussion',
    description: 'Get feedback and then discuss with the AI in a short conversation (up to 4 messages). Best for deeper understanding.',
    pros: ['Best pedagogical outcomes through dialogue', 'Students can ask "why?" and explore misconceptions', 'Still bounded cost (3-4 cents per interaction)'],
    cons: ['Highest per-question cost', 'Wider surface for off-topic use', 'Requires API key and backend'],
  },
};

export function ModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('ais-quiz-freetext-mode') || 'clipboard';
  });

  useEffect(() => {
    localStorage.setItem('ais-quiz-freetext-mode', mode);
  }, [mode]);

  return (
    <ModeContext.Provider value={{ mode, setMode, modes: MODES }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
