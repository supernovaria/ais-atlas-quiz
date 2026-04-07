import { createContext, useContext, useState, useEffect } from 'react';

const ModeContext = createContext();

const MODELS = {
  haiku: {
    id: 'haiku',
    label: 'Haiku (fast, cheap)',
    description: '~$0.0005 per evaluation',
  },
  sonnet: {
    id: 'sonnet',
    label: 'Sonnet (smarter)',
    description: '~$0.01 per evaluation',
  },
};

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
    description: 'Get feedback and then discuss with the AI in a short conversation. Best for deeper understanding.',
    pros: ['Best pedagogical outcomes through dialogue', 'Students can ask "why?" and explore misconceptions', 'Configurable message limit (2-10)'],
    cons: ['Highest per-question cost', 'Wider surface for off-topic use', 'Requires API key and backend'],
  },
};

export function ModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('ais-quiz-freetext-mode') || 'clipboard';
  });
  const [password, setPassword] = useState(() => {
    return localStorage.getItem('ais-quiz-password') || '';
  });
  const [model, setModel] = useState(() => {
    return localStorage.getItem('ais-quiz-model') || 'sonnet';
  });
  const [maxMessages, setMaxMessages] = useState(() => {
    return parseInt(localStorage.getItem('ais-quiz-max-messages'), 10) || 4;
  });

  useEffect(() => {
    localStorage.setItem('ais-quiz-freetext-mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('ais-quiz-password', password);
  }, [password]);

  useEffect(() => {
    localStorage.setItem('ais-quiz-model', model);
  }, [model]);

  useEffect(() => {
    localStorage.setItem('ais-quiz-max-messages', String(maxMessages));
  }, [maxMessages]);

  return (
    <ModeContext.Provider value={{ mode, setMode, modes: MODES, password, setPassword, model, setModel, models: MODELS, maxMessages, setMaxMessages }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
