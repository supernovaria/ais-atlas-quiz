import { useState, useEffect, useMemo } from 'react';

// AudioContext + pre-built buffers cached at module level.
// Buffers are built on first user interaction (guaranteed user gesture),
// so playback is instant — just createBufferSource().start().
let _audioCtx = null;
let _dingBuffer = null;
let _thonkBuffer = null;

function getAudioCtx() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Always resume inside a user-gesture handler; this is what fixes the
  // ~500-1000ms trackpad delay — browsers suspend the context when it wasn't
  // unlocked via a strong gesture, and resume() is synchronous when called
  // from within a click/keydown event.
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

function buildDingBuffer(ctx) {
  // Ascending D5 → G5 → C6, staggered 55ms — bright sine+triangle mix
  const sr = ctx.sampleRate;
  const notes = [
    { freq: 587.33, start: 0.0 },
    { freq: 783.99, start: 0.055 },
    { freq: 1046.5, start: 0.11 },
  ];
  const buf = ctx.createBuffer(1, Math.ceil(sr * 0.65), sr);
  const d = buf.getChannelData(0);
  for (const { freq, start } of notes) {
    const s0 = Math.floor(start * sr);
    for (let s = s0; s < d.length; s++) {
      const t = (s - s0) / sr;
      const env = Math.exp(-t * 7.5);
      const ph = 2 * Math.PI * freq * t;
      const sine = Math.sin(ph);
      const tri = sine - Math.sin(3 * ph) / 9 + Math.sin(5 * ph) / 25;
      d[s] += env * (0.55 * sine + 0.45 * tri) * 0.22;
    }
  }
  return buf;
}

function buildThonkBuffer(ctx) {
  // Short hollow thonk: pitch-swept sine (280 → 100 Hz) with fast decay.
  // Phase accumulation avoids discontinuities during the freq sweep.
  const sr = ctx.sampleRate;
  const len = Math.ceil(sr * 0.22);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  let phase = 0;
  for (let s = 0; s < len; s++) {
    const t = s / sr;
    const env = Math.exp(-t * 18);
    const freq = 100 + 180 * Math.exp(-t * 22); // sweeps 280→100 Hz
    phase += (2 * Math.PI * freq) / sr;
    d[s] = env * Math.sin(phase) * 0.28;
  }
  return buf;
}

// Call during any user gesture to ensure ctx is running and buffers are ready.
function prewarm() {
  try {
    const ctx = getAudioCtx(); // also calls resume()
    if (!_dingBuffer)  _dingBuffer  = buildDingBuffer(ctx);
    if (!_thonkBuffer) _thonkBuffer = buildThonkBuffer(ctx);
  } catch (e) { /* audio unavailable */ }
}

function playBuffer(buffer) {
  try {
    const ctx = getAudioCtx(); // resume() called here too
    if (!buffer) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start();
  } catch (e) { /* no-op */ }
}

function playDing()   { playBuffer(_dingBuffer); }
function playThonk()  { playBuffer(_thonkBuffer); }


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
    prewarm();
    setSelected(idx);
  }

  function handleSubmit() {
    if (selected === null) return;
    if (isCorrect) playDing(); else playThonk();
    onAnswer(isCorrect);
  }

  // Keyboard: 1-9 selects options
  useEffect(() => {
    function onKeyDown(e) {
      if (answered) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= options.length) {
        prewarm();
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
