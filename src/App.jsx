import { useState, useEffect } from 'react';
import { loadAllQuizzes } from './quizParser';
import Quiz from './components/Quiz';
import QuizSelector from './components/QuizSelector';
import './App.css';

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

              <p className="disclaimer">
                These questions are AI-generated placeholders for demonstration purposes.
                They are based on the Atlas content but have not been reviewed by the Atlas team.
              </p>
            </div>

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
  return <AppContent />;
}
