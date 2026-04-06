import { useState, useCallback, useEffect, useRef } from 'react';
import QuizQuestion from './QuizQuestion';
import FreeResponseQuestion from './FreeResponseQuestion';

function quizKey(quiz) {
  return `ais-quiz-${quiz.chapter}-${quiz.section}-${quiz.type}`;
}

function saveScore(quiz, score, total) {
  const key = quizKey(quiz);
  const prev = JSON.parse(localStorage.getItem(key) || 'null');
  const pct = Math.round((score / total) * 100);
  const entry = {
    score,
    total,
    pct,
    bestPct: prev ? Math.max(prev.bestPct, pct) : pct,
    lastAttempt: new Date().toISOString(),
  };
  localStorage.setItem(key, JSON.stringify(entry));
}

export function getScore(quiz) {
  return JSON.parse(localStorage.getItem(quizKey(quiz)) || 'null');
}

function QuizTitleBar({ quiz, counter, reviewMode }) {
  const icon = quiz.type === 'review' ? '\u{1F4D6}' : quiz.type === 'fr-only' ? '\u270F\uFE0F' : '\u00A7' + quiz.section;
  const typeLabel = reviewMode ? 'Reviewing Missed' : quiz.type === 'review' ? 'Chapter Review' : quiz.type === 'fr-only' ? 'Free Response' : 'Section Quiz';
  return (
    <div className="quiz-title-bar">
      <div className="quiz-title-left">
        <h3>{icon} {quiz.title}</h3>
        <span className="question-counter">{counter}</span>
      </div>
      <span className="quiz-type-badge">{typeLabel}</span>
    </div>
  );
}

export default function Quiz({ quiz, quizTitle }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]); // array of booleans
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndices, setReviewIndices] = useState([]);
  const [reviewPos, setReviewPos] = useState(0);
  const submitRef = useRef(null);
  const nextRef = useRef(null);

  const activeQuestions = reviewMode
    ? reviewIndices.map(i => quiz.questions[i])
    : quiz.questions;
  const activeIdx = reviewMode ? reviewPos : currentIdx;
  const question = activeQuestions[activeIdx];
  const isLast = activeIdx === activeQuestions.length - 1;

  const handleAnswer = useCallback((isCorrect, { autoAdvance } = {}) => {
    if (!reviewMode) {
      setAnswers(prev => [...prev, isCorrect]);
    }
    if (autoAdvance) {
      // Free-response: skip showResult, go directly to next
      if (isLast) {
        if (reviewMode) {
          setReviewMode(false);
        } else {
          setFinished(true);
        }
      } else {
        if (reviewMode) {
          setReviewPos(prev => prev + 1);
        } else {
          setCurrentIdx(prev => prev + 1);
        }
        setShowResult(false);
      }
    } else {
      setShowResult(true);
    }
  }, [reviewMode, isLast]);

  function handleNext() {
    if (isLast) {
      if (reviewMode) {
        setReviewMode(false);
      } else {
        setFinished(true);
      }
    } else {
      if (reviewMode) {
        setReviewPos(prev => prev + 1);
      } else {
        setCurrentIdx(prev => prev + 1);
      }
      setShowResult(false);
    }
  }

  function handleRestart() {
    setCurrentIdx(0);
    setAnswers([]);
    setShowResult(false);
    setFinished(false);
    setReviewMode(false);
    setReviewIndices([]);
    setReviewPos(0);
  }

  function handleReviewMissed() {
    const missed = answers.map((correct, i) => correct ? -1 : i).filter(i => i >= 0);
    setReviewIndices(missed);
    setReviewPos(0);
    setReviewMode(true);
    setShowResult(false);
    setFinished(false);
  }

  // Keyboard: Enter triggers submit or next depending on state
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Enter') {
        if (showResult && nextRef.current) {
          nextRef.current.click();
        } else if (!showResult && submitRef.current) {
          submitRef.current.click();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showResult]);

  if (finished) {
    const score = answers.filter(Boolean).length;
    const total = quiz.questions.length;
    const pct = Math.round((score / total) * 100);
    const missed = answers.filter(a => !a).length;

    saveScore(quiz, score, total);

    return (
      <div className="quiz-results">
        <h3>Quiz Complete!</h3>
        <div className="score-display">
          <div className="score-circle" style={{ '--pct': pct }}>
            <span className="score-number">{pct}%</span>
          </div>
          <p className="score-text">
            You got <strong>{score}</strong> out of <strong>{total}</strong> correct
          </p>
        </div>
        <div className="score-message">
          {pct === 100 && <p>Perfect score! You have an excellent understanding of this material.</p>}
          {pct >= 80 && pct < 100 && <p>Great job! You have a solid grasp of the key concepts.</p>}
          {pct >= 60 && pct < 80 && <p>Good effort! Consider reviewing the explanations for the questions you missed.</p>}
          {pct < 60 && <p>You might want to re-read this section and try again. The explanations above can help guide your review.</p>}
        </div>
        <div className="results-actions">
          <button className="submit-btn" onClick={handleRestart}>
            Try Again
          </button>
          {missed > 0 && (
            <button className="review-missed-btn" onClick={handleReviewMissed}>
              Review {missed} Missed Question{missed !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderQuestion(q, qNum, total, keyPrefix = '') {
    if (q.type === 'free-response') {
      return (
        <FreeResponseQuestion
          key={`${keyPrefix}fr-${qNum}`}
          question={q}
          questionNumber={qNum}
          totalQuestions={total}
          onAnswer={handleAnswer}
          quizTitle={quizTitle || quiz.title}
        />
      );
    }
    return (
      <QuizQuestion
        key={`${keyPrefix}mc-${qNum}`}
        question={q}
        questionNumber={qNum}
        totalQuestions={total}
        onAnswer={handleAnswer}
        showResult={showResult}
        submitRef={submitRef}
      />
    );
  }

  if (reviewMode) {
    return (
      <div className="quiz-container">
        <QuizTitleBar quiz={quiz} counter={`${reviewPos + 1} of ${reviewIndices.length} missed`} reviewMode={true} />
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((reviewPos + (showResult ? 1 : 0)) / reviewIndices.length) * 100}%` }}
          />
        </div>

        {renderQuestion(question, reviewIndices[reviewPos] + 1, quiz.questions.length, 'review-')}

        {showResult && question.type !== 'free-response' && (
          <button ref={nextRef} className="next-btn" onClick={handleNext}>
            {isLast ? 'Done' : 'Next \u2192'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <QuizTitleBar quiz={quiz} counter={`Question ${currentIdx + 1} of ${quiz.questions.length}`} reviewMode={false} />
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${((currentIdx + (showResult ? 1 : 0)) / quiz.questions.length) * 100}%` }}
        />
      </div>

      {renderQuestion(question, currentIdx + 1, quiz.questions.length)}

      {showResult && question.type !== 'free-response' && (
        <button ref={nextRef} className="next-btn" onClick={handleNext}>
          {isLast ? 'See Results' : 'Next Question \u2192'}
        </button>
      )}
    </div>
  );
}
