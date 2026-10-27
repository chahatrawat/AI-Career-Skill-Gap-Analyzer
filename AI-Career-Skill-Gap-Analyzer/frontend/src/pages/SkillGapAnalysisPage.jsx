import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { createRoadmap, getAnalysis, getAnalysisHistory, getQuizEvidence } from '../services/api.js';
import { EvidenceBadge } from './QuizPage.jsx';
import Loading, { EmptyState, ErrorState } from '../components/Loading.jsx';

const STATUS_LABEL = { met: 'Met', gap: 'Gap', missing: 'Missing' };

function ScoreRing({ score }) {
  const value = Number(score) || 0;
  return (
    <div className="score-ring" style={{ '--pct': value }} aria-label={`Readiness score ${value} out of 100`}>
      <span>
        {value.toFixed(1)}
        <small>%</small>
      </span>
    </div>
  );
}

function SkillRows({ title, skills, evidence = {} }) {
  if (!skills.length) return null;
  return (
    <div className="card">
      <h2>{title}</h2>
      {skills.map((s) => (
        <div className="skill-row" key={s.skillId}>
          <div>
            <strong>{s.name}</strong>
            {s.category && <div className="muted small">{s.category}</div>}
          </div>
          <div className="levels">
            {s.currentLevel == null ? 'Not rated' : `Level ${s.currentLevel}`} → needs {s.requiredLevel}
            {s.status !== 'met' && <> · priority {s.priority}</>}
            <div style={{ marginTop: '0.3rem' }}>
              {evidence[s.skillId]
                ? <EvidenceBadge evidence={evidence[s.skillId].evidence} level={evidence[s.skillId].estimatedLevel} />
                : <Link to="/quiz" className="small">Take a quiz to prove it</Link>}
            </div>
          </div>
          <span className={`status status-${s.status}`}>{STATUS_LABEL[s.status] || s.status}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- List of past analyses (/analysis) ----------
function History() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAnalysisHistory();
      setItems(Array.isArray(data) ? data : data?.assessments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading label="Loading your analyses…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!items.length) {
    return (
      <EmptyState title="No analyses yet" text="Rate your skills and run your first analysis.">
        <Link to="/assessment" className="btn btn-primary">Rate my skills</Link>
      </EmptyState>
    );
  }

  return (
    <div>
      <div className="page-head">
        <h1>Skill-gap analyses</h1>
        <p>Every analysis you run is saved here.</p>
      </div>
      <div className="card">
        {items.map((a) => {
          const id = a.assessmentId ?? a.id;
          return (
            <div className="history-row" key={id}>
              <div>
                <strong>{a.career?.name || a.careerName || 'Analysis'}</strong>
                <div className="muted small">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</div>
              </div>
              <div className="row">
                <strong>{Number(a.readinessScore).toFixed(1)}%</strong>
                <Link to={`/analysis/${id}`} className="btn btn-ghost btn-sm">View</Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- One analysis (/analysis/:id) ----------
function Detail({ id }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [evidence, setEvidence] = useState({});
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getAnalysis(id));
      // Quiz evidence is optional: the page works without it.
      getQuizEvidence()
        .then((list) => setEvidence(Object.fromEntries(list.map((e) => [e.skillId, e]))))
        .catch(() => setEvidence({}));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onGenerate = async () => {
    setGenerating(true);
    setGenError('');
    try {
      const roadmap = await createRoadmap(data.assessmentId ?? id, user.weeklyStudyHours);
      navigate(`/roadmaps/${roadmap.id}`);
    } catch (err) {
      setGenError(err.message);
      setGenerating(false);
    }
  };

  if (loading) return <Loading label="Loading analysis…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const skills = data.skills || [];
  const byPriority = (a, b) => (b.priority ?? 0) - (a.priority ?? 0);
  const met = skills.filter((s) => s.status === 'met');
  const gaps = skills.filter((s) => s.status === 'gap').sort(byPriority);
  const missing = skills.filter((s) => s.status === 'missing').sort(byPriority);
  const counts = data.counts || { met: met.length, gap: gaps.length, missing: missing.length };
  const ai = data.ai;
  const nothingToLearn = counts.gap + counts.missing === 0;
  const nameOf = (skillId) => skills.find((s) => s.skillId === skillId)?.name || 'Skill';

  return (
    <div className="stack">
      <div className="page-head">
        <h1>{data.career?.name} readiness</h1>
        <p>{data.createdAt ? `Analysed on ${new Date(data.createdAt).toLocaleString()}` : ''}</p>
      </div>

      <div className="card row" style={{ gap: '2rem' }}>
        <ScoreRing score={data.readinessScore} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="counts">
            <div className="count-box"><strong style={{ color: 'var(--good)' }}>{counts.met}</strong>Met</div>
            <div className="count-box"><strong style={{ color: 'var(--warn)' }}>{counts.gap}</strong>Gaps</div>
            <div className="count-box"><strong style={{ color: 'var(--bad)' }}>{counts.missing}</strong>Missing</div>
          </div>
          <p className="muted small" style={{ marginTop: '0.8rem' }}>
            The score is calculated by the app from your ratings and the career’s required levels,
            weighted by importance.
          </p>
        </div>
      </div>

      {ai && (
        <div className="card">
          <h2>Explanation</h2>
          <p>{ai.summary}</p>
          {ai.priorities?.length > 0 && (
            <>
              <h3>Learn these first</h3>
              <ol>
                {ai.priorities.map((p) => (
                  <li key={p.skillId}>
                    <strong>{nameOf(p.skillId)}:</strong> {p.reason}
                  </li>
                ))}
              </ol>
            </>
          )}
          <div className="notice">
            {ai.aiGenerated
              ? 'AI-generated suggestion, not a guarantee.'
              : 'The AI was unavailable, so this explanation was built from simple rules.'}
          </div>
        </div>
      )}

      <SkillRows title="Skills to improve" skills={gaps} evidence={evidence} />
      <SkillRows title="Missing skills" skills={missing} evidence={evidence} />
      <SkillRows title="Strengths" skills={met} evidence={evidence} />

      {genError && <div className="form-error" role="alert">{genError}</div>}
      <div className="row">
        <button className="btn btn-primary" disabled={generating || nothingToLearn} onClick={onGenerate}>
          {generating ? 'Generating roadmap… this can take a few seconds' : 'Generate learning roadmap'}
        </button>
        <Link to="/assessment" className="btn btn-ghost">Update ratings</Link>
        <Link to="/analysis" className="btn btn-ghost">All analyses</Link>
      </div>
      {nothingToLearn && <p className="muted small">You meet every requirement, so there is nothing to put in a roadmap.</p>}
    </div>
  );
}

export default function SkillGapAnalysisPage() {
  const { id } = useParams();
  return id ? <Detail key={id} id={id} /> : <History />;
}
