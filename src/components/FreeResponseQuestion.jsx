import { useState, useRef } from 'react';
import { useMode } from '../ModeContext';

function ClipboardMode({ question, answer, quizTitle }) {
  const [copied, setCopied] = useState(false);

  function buildPrompt() {
    return `I'm studying the AI Safety Atlas, Chapter 1: Capabilities, section "${quizTitle}".

I was asked the following question:
"${question.question}"

Here is my answer:
"${answer}"

Context for evaluating my answer (from the quiz designers):
${question.context}

Please evaluate my answer. Tell me:
1. What I got right
2. What I missed or got wrong
3. A brief explanation of the key concepts I should understand
Keep your feedback concise and educational.`;
  }

  async function handleCopy() {
    const prompt = buildPrompt();
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpenClaude() {
    handleCopy();
    window.open('https://claude.ai/new', '_blank');
  }

  return (
    <div className="fr-mode-clipboard">
      <p className="fr-mode-hint">
        Your answer will be packaged into a prompt. Copy it and paste into Claude for feedback.
      </p>
      <div className="fr-clipboard-actions">
        <button className="fr-btn fr-btn-secondary" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy Prompt'}
        </button>
        <button className="fr-btn fr-btn-primary" onClick={handleOpenClaude}>
          Open Claude &amp; Copy Prompt
        </button>
      </div>
    </div>
  );
}

function SingleShotMode({ question, answer, quizTitle }) {
  const { password, model } = useMode();
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleEvaluate() {
    setLoading(true);
    setError(null);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (password) headers['X-Quiz-Password'] = password;
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode: 'singleshot',
          model,
          quizTitle,
          question: question.question,
          context: question.context,
          answer,
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setFeedback(data.feedback);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fr-mode-singleshot">
      {!feedback && !loading && (
        <button className="fr-btn fr-btn-primary" onClick={handleEvaluate} disabled={loading}>
          Get AI Feedback
        </button>
      )}
      {loading && (
        <div className="fr-loading">
          <div className="fr-spinner" />
          <span>Evaluating your answer...</span>
        </div>
      )}
      {error && (
        <div className="fr-error">
          <strong>Error:</strong> {error}
          <button className="fr-btn fr-btn-secondary fr-btn-sm" onClick={handleEvaluate}>Retry</button>
        </div>
      )}
      {feedback && (
        <div className="fr-feedback">
          <div className="fr-feedback-header">AI Feedback</div>
          <div className="fr-feedback-body">{feedback}</div>
        </div>
      )}
    </div>
  );
}

function ChatMode({ question, answer, quizTitle }) {
  const { password, model, maxMessages: MAX_MESSAGES } = useMode();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [started, setStarted] = useState(false);
  const chatEndRef = useRef(null);

  const userMessageCount = messages.filter(m => m.role === 'user').length;
  const canSendMore = userMessageCount < MAX_MESSAGES;

  async function sendMessage(userMessage, existingMessages = messages) {
    const newMessages = [...existingMessages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);
    setError(null);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (password) headers['X-Quiz-Password'] = password;
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode: 'chat',
          model,
          maxMessages: MAX_MESSAGES,
          quizTitle,
          question: question.question,
          context: question.context,
          answer,
          messages: newMessages,
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.feedback }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }

  function handleStart() {
    setStarted(true);
    sendMessage(`Here is my answer to the question:\n\n${answer}\n\nPlease evaluate it and let me know what I got right and what I could improve.`, []);
  }

  function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || !canSendMore || loading) return;
    const msg = input.trim();
    setInput('');
    sendMessage(msg);
  }

  return (
    <div className="fr-mode-chat">
      {!started && (
        <div>
          <p className="fr-mode-hint">
            Start a short discussion about your answer. You can ask up to {MAX_MESSAGES} follow-up questions.
          </p>
          <button className="fr-btn fr-btn-primary" onClick={handleStart}>
            Start Discussion
          </button>
        </div>
      )}
      {started && (
        <div className="fr-chat-container">
          <div className="fr-chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`fr-chat-msg fr-chat-${msg.role}`}>
                <div className="fr-chat-label">{msg.role === 'user' ? 'You' : 'AI Tutor'}</div>
                <div className="fr-chat-content">{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div className="fr-chat-msg fr-chat-assistant">
                <div className="fr-chat-label">AI Tutor</div>
                <div className="fr-chat-content fr-loading-dots">Thinking...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          {error && (
            <div className="fr-error">
              <strong>Error:</strong> {error}
            </div>
          )}
          {canSendMore ? (
            <form className="fr-chat-input" onSubmit={handleSend}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask a follow-up question..."
                disabled={loading}
              />
              <button type="submit" className="fr-btn fr-btn-primary fr-btn-sm" disabled={loading || !input.trim()}>
                Send
              </button>
            </form>
          ) : (
            <div className="fr-chat-limit">
              Discussion complete ({MAX_MESSAGES} messages used)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FreeResponseQuestion({ question, questionNumber, totalQuestions, onAnswer, quizTitle }) {
  const { mode, modes } = useMode();
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (!answer.trim()) return;
    setSubmitted(true);
  }

  function handleDone() {
    onAnswer(true, { autoAdvance: true }); // free-response always counts as "answered" for progress
  }

  return (
    <div className="quiz-question fr-question">
      <div className="question-header">
        <span className="question-counter">Question {questionNumber} of {totalQuestions}</span>
        <span className="fr-badge">Free Response</span>
      </div>

      <p className="question-text">{question.question}</p>

      {!submitted ? (
        <div className="fr-input-area">
          <textarea
            className="fr-textarea"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Type your answer here..."
            rows={5}
          />
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={!answer.trim()}
          >
            Submit Answer
          </button>
        </div>
      ) : (
        <div className="fr-submitted">
          <div className="fr-your-answer">
            <div className="fr-your-answer-label">Your answer:</div>
            <div className="fr-your-answer-text">{answer}</div>
          </div>

          <div className="fr-mode-label">
            Feedback via: <strong>{modes[mode].shortLabel}</strong>
          </div>

          {mode === 'clipboard' && (
            <ClipboardMode question={question} answer={answer} quizTitle={quizTitle} />
          )}
          {mode === 'singleshot' && (
            <SingleShotMode question={question} answer={answer} quizTitle={quizTitle} />
          )}
          {mode === 'chat' && (
            <ChatMode question={question} answer={answer} quizTitle={quizTitle} />
          )}

          <button className="next-btn" onClick={handleDone} style={{ marginTop: '1rem' }}>
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
