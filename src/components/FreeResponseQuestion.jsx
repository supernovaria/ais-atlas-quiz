import { useState, useRef, useEffect } from 'react';
import { useMode } from '../ModeContext';

function ClipboardMode({ question, answer, quizTitle }) {
  const [copied, setCopied] = useState(false);

  function buildPrompt() {
    const lines = [
      `Quiz: ${quizTitle}`,
      ``,
      `Question: ${question.question}`,
      ``,
      `My answer: ${answer}`,
      ``,
      `Please evaluate my answer. Give me feedback on what I got right, what I missed, and any key concepts I should understand better.`,
    ];
    return lines.join('\n');
  }

  async function handleCopy() {
    const prompt = buildPrompt();
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  }

  function handleOpen() {
    handleCopy();
    window.open('https://claude.ai', '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="fr-mode-clipboard">
      <p className="fr-mode-hint">
        Copy a prompt with your answer and open Claude.ai to get feedback.
      </p>
      <div className="fr-clipboard-actions">
        <button className="fr-btn fr-btn-secondary" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy Prompt'}
        </button>
        <button className="fr-btn fr-btn-primary" onClick={handleOpen}>
          Copy &amp; Open Claude
        </button>
      </div>
    </div>
  );
}

function SingleShotMode({ question, answer, quizTitle, password, model }) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);

  async function handleGetFeedback() {
    setStarted(true);
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'singleshot',
          model,
          quizTitle,
          question: question.question,
          context: question.context,
          answer,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'An error occurred. Please try again.');
      } else {
        setFeedback(data.feedback);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!started) {
    return (
      <div className="fr-mode-singleshot">
        <p className="fr-mode-hint">
          Send your answer to our AI for a one-time evaluation with structured feedback.
        </p>
        <button className="fr-btn fr-btn-primary" onClick={handleGetFeedback}>
          Get Feedback
        </button>
      </div>
    );
  }

  return (
    <div className="fr-mode-singleshot">
      {loading && (
        <div className="fr-loading">
          <div className="fr-spinner" />
          <span className="fr-loading-dots">Evaluating your answer...</span>
        </div>
      )}
      {error && <div className="fr-error">{error}</div>}
      {feedback && (
        <div className="fr-feedback">
          <div className="fr-feedback-header">Feedback</div>
          <div className="fr-feedback-body">{feedback}</div>
        </div>
      )}
    </div>
  );
}

function ChatMode({ question, answer, quizTitle, password, model, maxMessages }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  async function sendMessage(history) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'chat',
          model,
          maxMessages,
          quizTitle,
          question: question.question,
          context: question.context,
          answer,
          password,
          messages: history,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'An error occurred. Please try again.');
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.feedback }]);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    setStarted(true);
    await sendMessage([]);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    await sendMessage(updated);
  }

  const totalExchanges = Math.floor(messages.filter(m => m.role === 'assistant').length);
  const limitReached = totalExchanges >= maxMessages;

  if (!started) {
    return (
      <div className="fr-mode-chat">
        <p className="fr-mode-hint">
          Get feedback and discuss your answer with an AI tutor ({maxMessages} exchanges).
        </p>
        <button className="fr-btn fr-btn-primary" onClick={handleStart}>
          Start Discussion
        </button>
      </div>
    );
  }

  return (
    <div className="fr-mode-chat">
      <div className="fr-chat-container">
        <div className="fr-chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`fr-chat-msg ${msg.role === 'user' ? 'fr-chat-user' : 'fr-chat-assistant'}`}>
              <div className="fr-chat-label">{msg.role === 'user' ? 'You' : 'AI Tutor'}</div>
              <div className="fr-chat-content">{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div className="fr-chat-msg fr-chat-assistant">
              <div className="fr-chat-label">AI Tutor</div>
              <div className="fr-loading">
                <div className="fr-spinner" />
                <span className="fr-loading-dots">Thinking...</span>
              </div>
            </div>
          )}
          {error && <div className="fr-error">{error}</div>}
          <div ref={messagesEndRef} />
        </div>

        {limitReached ? (
          <div className="fr-chat-limit">
            Discussion complete ({maxMessages} exchanges used).
          </div>
        ) : (
          <form className="fr-chat-input" onSubmit={handleSend}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask a follow-up question..."
              disabled={loading}
            />
            <button type="submit" className="fr-btn fr-btn-primary" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
        )}
      </div>
      <p className="fr-mode-hint">{totalExchanges} of {maxMessages} exchanges used.</p>
    </div>
  );
}

export default function FreeResponseQuestion({ question, questionNumber, totalQuestions, onAnswer, quizTitle }) {
  const { mode, modes, password, model, maxMessages } = useMode();
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [answerRevealed, setAnswerRevealed] = useState(false);

  function handleSubmit() {
    if (!answer.trim()) return;
    setSubmitted(true);
  }

  function handleEdit() {
    setSubmitted(false);
  }

  function handleDone() {
    onAnswer(true, { autoAdvance: true });
  }

  return (
    <div className="fr-question">
      <div className="question-header">
        <span className="question-number">Question {questionNumber} of {totalQuestions}</span>
        <span className="fr-badge">Free Response</span>
      </div>

      <div className="question-text">{question.question}</div>

      {!submitted ? (
        <>
          {question.hint && (
            <>
              <button
                className="fr-hint-btn"
                onClick={() => setHintShown(h => !h)}
              >
                {hintShown ? 'Hide hint' : 'Show hint'}
              </button>
              {hintShown && (
                <div className="fr-hint-box">{question.hint}</div>
              )}
            </>
          )}

          <textarea
            className="fr-textarea"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Type your answer here..."
            rows={5}
          />

          <button
            className="fr-btn fr-btn-primary"
            onClick={handleSubmit}
            disabled={!answer.trim()}
          >
            Submit Answer
          </button>
        </>
      ) : (
        <>
          <div className="fr-submitted">
            <div className="fr-your-answer">
              <div className="fr-your-answer-label">
                Your answer
                <button className="fr-btn fr-btn-sm fr-btn-secondary" onClick={handleEdit}>
                  Edit
                </button>
              </div>
              <div className="fr-your-answer-text">{answer}</div>
            </div>

            {question.shortAnswer && (
              <div>
                {!answerRevealed ? (
                  <button
                    className="fr-btn fr-btn-secondary"
                    onClick={() => setAnswerRevealed(true)}
                  >
                    Reveal answer
                  </button>
                ) : (
                  <div className="fr-short-answer">
                    <div className="fr-short-answer-header">
                      Reference answer
                      <button
                        className="fr-btn fr-btn-sm fr-btn-secondary"
                        onClick={() => setAnswerRevealed(false)}
                      >
                        Hide
                      </button>
                    </div>
                    <div>{question.shortAnswer}</div>
                  </div>
                )}
              </div>
            )}

            <div className="fr-mode-label">
              Feedback via: <strong>{modes[mode].shortLabel}</strong>
            </div>

            {mode === 'clipboard' && (
              <ClipboardMode question={question} answer={answer} quizTitle={quizTitle} />
            )}
            {mode === 'singleshot' && (
              <SingleShotMode
                question={question}
                answer={answer}
                quizTitle={quizTitle}
                password={password}
                model={model}
              />
            )}
            {mode === 'chat' && (
              <ChatMode
                question={question}
                answer={answer}
                quizTitle={quizTitle}
                password={password}
                model={model}
                maxMessages={maxMessages}
              />
            )}

            <button className="fr-btn fr-btn-primary" onClick={handleDone}>
              Continue
            </button>
          </div>
        </>
      )}
    </div>
  );
}
