import { useState, useEffect } from 'react';
import { loadAllQuizzes } from './quizParser';
import { ModeProvider, useMode } from './ModeContext';
import Quiz from './components/Quiz';
import QuizSelector from './components/QuizSelector';
import './App.css';

function ModeSelector() {
  const { mode, setMode, modes, password, setPassword, model, setModel, models, maxMessages, setMaxMessages } = useMode();

  return (
    <div className="mode-selector">
      <h3>Free-Response Feedback Mode</h3>
      <p className="mode-selector-desc">
        Some questions ask you to write a free-text answer. Choose how you'd like to receive AI feedback on those answers.
        Modes B and C require a password and use our API.
      </p>

      <div className="mode-settings">
        <div className="mode-setting-row">
          <label className="mode-setting-label" htmlFor="quiz-password">API Password</label>
          <input
            id="quiz-password"
            type="password"
            className="mode-setting-input"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Required for Modes B &amp; C"
          />
        </div>
        <div className="mode-setting-row">
          <label className="mode-setting-label">Model</label>
          <div className="model-toggle">
            {Object.values(models).map(m => (
              <button
                key={m.id}
                className={`model-toggle-btn ${model === m.id ? 'model-active' : ''}`}
                onClick={() => setModel(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mode-setting-row">
          <label className="mode-setting-label" htmlFor="quiz-max-messages">Chat messages</label>
          <div className="mode-setting-slider">
            <input
              id="quiz-max-messages"
              type="range"
              min="2"
              max="10"
              value={maxMessages}
              onChange={e => setMaxMessages(parseInt(e.target.value, 10))}
            />
            <span className="mode-setting-value">{maxMessages}</span>
          </div>
        </div>
      </div>

      <div className="mode-options">
        {Object.values(modes).map(m => (
          <button
            key={m.id}
            className={`mode-option ${mode === m.id ? 'mode-active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            <div className="mode-option-header">
              <span className="mode-option-radio">{mode === m.id ? '\u25C9' : '\u25CB'}</span>
              <strong>{m.label}</strong>
            </div>
            <p className="mode-option-desc">{m.description}</p>
            <div className="mode-option-tags">
              {m.pros.map((p, i) => <span key={i} className="mode-tag mode-tag-pro">+ {p}</span>)}
              {m.cons.map((c, i) => <span key={i} className="mode-tag mode-tag-con">- {c}</span>)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AppContent() {
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllQuizzes().then(data => {
      setQuizzes(data);
      setLoading(false);
    });
  }, []);

  function handleBack() {
    setActiveQuiz(null);
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading quizzes...</div>
      </div>
    );
  }

  const hasFreeResponse = quizzes.some(q => q.questions.some(qq => qq.type === 'free-response'));

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          {activeQuiz && (
            <button className="back-btn" onClick={handleBack}>
              &larr; Back
            </button>
          )}
          <div className="header-text">
            <h1>AI Safety Atlas</h1>
            <h2>Chapter 1: Capabilities &mdash; Quiz Companion</h2>
          </div>
        </div>
        <div className="header-badge">
          <span>Proof of Concept</span>
        </div>
      </header>

      <main className="app-main">
        {!activeQuiz ? (
          <div className="home">
            <div className="intro">
              <div className="poc-banner">
                <h3>Proof of Concept for CeSIA</h3>
                <p>
                  This is a proof-of-concept demonstrating what an interactive quiz companion for the{' '}
                  <a href="https://ai-safety-atlas.com/chapters/v1/capabilities/introduction/" target="_blank" rel="noopener noreferrer">
                    AI Safety Atlas
                  </a>{' '}
                  could look like. It explores different approaches to AI-assisted learning.
                </p>
              </div>

              <div className="poc-types">
                <h4>Question Types</h4>
                <div className="poc-type-list">
                  <div className="poc-type">
                    <strong>Multiple Choice</strong> &mdash; Traditional quiz questions that test recall
                    and understanding of key concepts. Always available, no AI needed.
                  </div>
                  <div className="poc-type">
                    <strong>Free Response</strong> &mdash; Open-ended questions where you write your own answer,
                    then receive AI-powered feedback. Three different feedback modes are available
                    to demonstrate different cost/quality tradeoffs.
                  </div>
                </div>
              </div>

              <p className="disclaimer">
                These questions are AI-generated placeholders for demonstration purposes.
                They are based on the Atlas content but have not been reviewed by the Atlas team.
              </p>
            </div>

            {hasFreeResponse && <ModeSelector />}

            <QuizSelector
              quizzes={quizzes}
              onSelect={setActiveQuiz}
              activeQuiz={activeQuiz}
            />
          </div>
        ) : (
          <div className="quiz-view">
            <Quiz key={activeQuiz.title} quiz={activeQuiz} quizTitle={activeQuiz.title} />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Proof of concept for{' '}
          <a href="https://ai-safety-atlas.com/chapters/v1/capabilities/introduction/" target="_blank" rel="noopener noreferrer">
            AI Safety Atlas
          </a>
          {' '}&mdash; questions are AI-generated placeholders, not endorsed by the Atlas team.
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ModeProvider>
      <AppContent />
    </ModeProvider>
  );
}
