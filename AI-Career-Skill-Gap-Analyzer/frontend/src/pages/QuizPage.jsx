import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getQuiz, getQuizSkills, saveMySkills, submitQuiz } from '../services/api.js';
import Loading, { EmptyState, ErrorState } from '../components/Loading.jsx';
import { LEVEL_LABELS } from '../components/SkillCard.jsx';

export const EVIDENCE_LABEL = {
  supported: 'Quiz supports your rating',
  close: 'Slightly below your rating',
  overrated: 'Well below your rating',
  unrated: 'Quiz taken, skill not rated',
};

export function EvidenceBadge({ evidence, level }) {
  if (!evidence) return <span className="badge">No quiz yet</span>;
  return (
    <span className={`badge evidence evidence-${evidence}`} title={EVIDENCE_LABEL[evidence]}>
      {evidence === 'supported' ? '✓' : evidence === 'close' ? '≈' : evidence === 'overrated' ? '!' : '?'}{' '}
      Quiz: {LEVEL_LABELS[level] || level}
    </span>
  );
}

// ---------- Taking one quiz ----------
function TakeQuiz({ skillId, onDone }) {
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setQuiz(await getQuiz(skillId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [skillId]);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const payload = quiz.questions.map((q) => ({ questionId: q.id, optionId: answers[q.id] }));
      setResult(await submitQuiz(skillId, payload, false));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Updates only this skill's rating; the attempt itself was already saved on submit.
  const applyRating = async () => {
    setBusy(true);
    setError('');
    try {
      await saveMySkills([{ skillId: Number(skillId), level: result.estimatedLevel }]);
      setResult((r) => ({ ...r, selfLevel: r.estimatedLevel, evidence: 'supported', ratingUpdated: true }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading label="Loading quiz…" />;
  if (error && !quiz) return <ErrorState message={error} onRetry={load} />;

  if (result) {
    return (
      <div className="stack">
        <button className="btn btn-ghost btn-sm" onClick={onDone}>← All skills</button>
        <div className="card">
          <h2>{result.skill.name}: {result.correct} of {result.total} correct</h2>
          <p>
            Estimated level from this quiz: <strong>{LEVEL_LABELS[result.estimatedLevel]}</strong>
            {result.selfLevel != null && <> · your rating: <strong>{LEVEL_LABELS[result.selfLevel]}</strong></>}
          </p>
          <EvidenceBadge evidence={result.evidence} level={result.estimatedLevel} />
          {result.ratingUpdated && <p className="form-success" style={{ marginTop: '1rem' }}>Your rating was updated to match.</p>}
          <p className="muted small" style={{ marginTop: '1rem' }}>
            A short quiz is evidence, not a verdict. It can show at most “Advanced”, and your own rating
            still drives your readiness score.
          </p>
          {error && <div className="form-error" role="alert">{error}</div>}
          {!result.ratingUpdated && result.selfLevel !== result.estimatedLevel && (
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={applyRating}>
              Set my rating to {LEVEL_LABELS[result.estimatedLevel]}
            </button>
          )}
        </div>
        <div className="card">
          <h3>Review</h3>
          {result.review.map((r) => (
            <div className="review-row" key={r.questionId}>
              <span className={r.correct ? 'review-mark ok' : 'review-mark bad'}>{r.correct ? '✓' : '✗'}</span>
              <div>
                <strong>{r.prompt}</strong>
                <div className="muted small">Your answer: {r.yourAnswer}</div>
                {!r.correct && <div className="small" style={{ color: 'var(--good)' }}>Correct: {r.correctAnswer}</div>}
              </div>
            </div>
          ))}
        </div>
        <Link to="/roadmaps" className="small">Learn this skill on your roadmap →</Link>
      </div>
    );
  }

  const answered = Object.keys(answers).length;
  return (
    <div className="stack">
      <button className="btn btn-ghost btn-sm" onClick={onDone}>← All skills</button>
      <div className="page-head">
        <h1>{quiz.skill.name} quiz</h1>
        <p>{quiz.questions.length} questions. Answer without looking anything up so the result is real evidence.</p>
      </div>
      {quiz.questions.map((q, i) => (
        <fieldset className="card quiz-q" key={q.id}>
          <legend>{i + 1}. {q.prompt}</legend>
          {q.options.map((o) => (
            <label className={answers[q.id] === o.id ? 'quiz-opt selected' : 'quiz-opt'} key={o.id}>
              <input type="radio" name={`q${q.id}`} checked={answers[q.id] === o.id}
                     onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))} />
              {o.text}
            </label>
          ))}
        </fieldset>
      ))}
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="card sticky-bar">
        <span><strong>{answered}</strong> of {quiz.questions.length} answered</span>
        <button className="btn btn-primary" disabled={busy || answered < quiz.questions.length} onClick={submit}>
          {busy ? 'Checking…' : 'Submit answers'}
        </button>
      </div>
    </div>
  );
}

// ---------- Skill list (/quiz) ----------
export default function QuizPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [skillId, setSkillId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getQuizSkills());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (skillId) {
    return <TakeQuiz key={skillId} skillId={skillId} onDone={() => { setSkillId(null); load(); }} />;
  }
  if (loading) return <Loading label="Loading your skills…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data.career) {
    return (
      <EmptyState title="Pick a target career first" text="Quizzes cover the skills of your target career.">
        <Link to="/careers" className="btn btn-primary">Choose a career</Link>
      </EmptyState>
    );
  }

  const tested = data.skills.filter((s) => s.latestAttempt).length;
  return (
    <div>
      <div className="page-head">
        <h1>Skill quiz</h1>
        <p>
          Back up your self-ratings for {data.career.name} with a short quiz per skill.
          {' '}<strong>{tested}</strong> of {data.skills.length} tested.
        </p>
      </div>
      <div className="grid grid-2">
        {data.skills.map((s) => (
          <div className="card" key={s.skillId}>
            <div className="row-between">
              <h3>{s.name}</h3>
              <EvidenceBadge evidence={s.evidence} level={s.latestAttempt?.estimatedLevel} />
            </div>
            <p className="muted small">
              {s.category} · needs {LEVEL_LABELS[s.requiredLevel]} · you rated{' '}
              {s.selfLevel ? LEVEL_LABELS[s.selfLevel] : 'nothing yet'}
            </p>
            {s.latestAttempt && (
              <p className="small">Last result: {s.latestAttempt.correct}/{s.latestAttempt.total} correct</p>
            )}
            <button className="btn btn-ghost btn-sm" disabled={!s.questionCount} onClick={() => setSkillId(s.skillId)}>
              {s.latestAttempt ? 'Retake quiz' : 'Take quiz'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
