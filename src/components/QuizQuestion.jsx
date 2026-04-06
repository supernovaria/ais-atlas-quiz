import { useState, useEffect, useMemo } from 'react';

// Pre-generate a correct-answer ding as an AudioBuffer on first use,
// then reuse it so there's no synthesis delay on playback.
let _audioCtx = null;
let _dingBuffer = null;

function getAudioContext() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _audioCtx;
}

function buildDingBuffer(ctx) {
  // Three-note ascending run: C5 → E5 → G5, staggered 55ms apart
  // Each note: sine + triangle mix for a bright, warm tone
  const sampleRate = ctx.sampleRate;
  const duration = 0.65;
  const notes = [
    { freq: 587.33, start: 0.0 },   // D5
    { freq: 783.99, start: 0.055 },  // G5
    { freq: 1046.5, start: 0.11 },   // C6
  ];
  const bufLen = Math.ceil(sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufLen, sampleRate);
  const data = buffer.getChannelData(0);

  for (const { freq, start } of notes) {
    const startSample = Math.floor(start * sampleRate);
    for (let s = startSample; s < bufLen; s++) {
      const t = (s - startSample) / sampleRate;
      // Envelope: sharp attack, exponential decay
      const env = Math.exp(-t * 7.5);
      // Mix sine (pure) + triangle (adds warmth/brightness)
      const phase = 2 * Math.PI * freq * t;
      const sine = Math.sin(phase);
      // Triangle wave via Fourier: sin(x) - sin(3x)/9 + sin(5x)/25 ...
      const tri = Math.sin(phase) - Math.sin(3 * phase) / 9 + Math.sin(5 * phase) / 25;
      data[s] += env * (0.55 * sine + 0.45 * tri) * 0.22;
    }
  }
  return buffer;
}

function prewarmDing() {
  try {
    const ctx = getAudioContext();
    if (!_dingBuffer) {
      _dingBuffer = buildDingBuffer(ctx);
    }
  } catch (e) {
    // audio unavailable
  }
}

function playDing() {
  try {
    const ctx = getAudioContext();
    if (!_dingBuffer) {
      _dingBuffer = buildDingBuffer(ctx);
    }
    const source = ctx.createBufferSource();
    source.buffer = _dingBuffer;
    source.connect(ctx.destination);
    source.start();
  } catch (e) {
    // audio unavailable, no-op
  }
}


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
    prewarmDing();
    setSelected(idx);
  }

  function handleSubmit() {
    if (selected === null) return;
    if (isCorrect) playDing();
    onAnswer(isCorrect);
  }

  // Keyboard: 1-9 selects options
  useEffect(() => {
    function onKeyDown(e) {
      if (answered) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= options.length) {
        prewarmDing();
        setSelected(num - 1);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [answered, options.length]);

  return (
    <div className="quiz-question">
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
