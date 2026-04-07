import { getScore } from './Quiz';

export default function QuizSelector({ quizzes, onSelect, activeQuiz }) {
  const sectionQuizzes = quizzes.filter(q => q.type === 'section');
  const reviewQuizzes = quizzes.filter(q => q.type === 'review');

  function ScoreBadge({ quiz }) {
    const saved = getScore(quiz);
    if (!saved) return null;
    const incomplete = saved.bestPct < 95;
    return (
      <span className={`selector-score${incomplete ? ' selector-score--incomplete' : ''}`} title={`Best: ${saved.bestPct}%`}>
        {saved.bestPct}%
      </span>
    );
  }

  return (
    <nav className="quiz-selector">
      <div className="selector-group">
        <h3>Section Quizzes</h3>
        <p className="selector-tip"><em>Tip: press 1–4 to select an answer, Enter to check it.</em></p>
        {sectionQuizzes.map((quiz, idx) => (
          <button
            key={idx}
            className={`selector-btn ${activeQuiz === quiz ? 'active' : ''}`}
            onClick={() => onSelect(quiz)}
          >
            <span className="selector-section">{'\u00A7'}{quiz.section}</span>
            <span className="selector-title">{quiz.title}</span>
            <ScoreBadge quiz={quiz} />
            <span className="selector-count">{quiz.questions.length} questions</span>
          </button>
        ))}
      </div>

{reviewQuizzes.length > 0 && (
        <div className="selector-group">
          <h3>Chapter Review</h3>
          {reviewQuizzes.map((quiz, idx) => (
            <button
              key={idx}
              className={`selector-btn review-btn ${activeQuiz === quiz ? 'active' : ''}`}
              onClick={() => onSelect(quiz)}
            >
              <span className="selector-title">{quiz.title}</span>
              <ScoreBadge quiz={quiz} />
              <span className="selector-count">{quiz.questions.length} questions</span>
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
