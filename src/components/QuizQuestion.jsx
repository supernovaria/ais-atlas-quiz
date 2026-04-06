import { useState, useEffect, useMemo } from 'react';

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function QuizQuestion({ question, questionNumber, totalQuestions, onAnswer, showResult, submitRef }) {
  const options = useMemo(
    () => question.shuffleAnswers !== false ? shuffleArray(question.options) : question.options,
    [question]
  );
  const [selected, setSelected] = useState(null);
  const answered = showResult && selected !== null;
  const correctIndex = options.findIndex(o => o.isCorrect);
  const isCorrect = selected === correctIndex;

  function handleSelect(idx) {
    if (answered) return;
    setSelected(idx);
  }

  function handleSubmit() {
    if (selected === null) return;
    onAnswer(isCorrect);
  }

  // Keyboard: 1-9 selects options
  useEffect(() => {
    function onKeyDown(e) {
      if (answered) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= options.length) {
        setSelected(num - 1);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [answered, options.length]);

  return (
    <div className="quiz-question">
      <div className="question-header">
        <span className="question-counter">Question {questionNumber} of {totalQuestions}</span>
      </div>

      <p className="question-text">{question.question}</p>

      <div className="options-list">
        {options.map((option, idx) => {
          let className = 'option';
          if (selected === idx) className += ' selected';
          if (answered) {
            if (idx === correctIndex) className += ' correct';
            else if (selected === idx) className += ' incorrect';
          }

          return (
            <button
              key={idx}
              className={className}
              onClick={() => handleSelect(idx)}
              disabled={answered}
            >
              <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
              <span className="option-text">{option.text}</span>
              {answered && idx === correctIndex && <span className="option-icon">&#10003;</span>}
              {answered && selected === idx && idx !== correctIndex && <span className="option-icon">&#10007;</span>}
            </button>
          );
        })}
      </div>

      {!answered && (
        <button
          ref={submitRef}
          className="submit-btn"
          onClick={handleSubmit}
          disabled={selected === null}
        >
          Check Answer
        </button>
      )}

      {answered && question.explanation && (
        <div className={`explanation ${isCorrect ? 'explanation-correct' : 'explanation-incorrect'}`}>
          <div className="explanation-header">
            {isCorrect ? '\u2713 Correct!' : '\u2717 Incorrect'}
          </div>
          <p>{question.explanation}</p>
        </div>
      )}
    </div>
  );
}
