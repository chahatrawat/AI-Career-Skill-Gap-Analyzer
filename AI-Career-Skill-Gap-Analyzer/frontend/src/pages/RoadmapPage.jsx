import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  createRoadmap, deleteRoadmap, getAnalysisHistory, getRoadmap, getRoadmaps, updateRoadmapItem,
} from '../services/api.js';
import Loading, { EmptyState, ErrorState } from '../components/Loading.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import RoadmapCard from '../components/RoadmapCard.jsx';

const TYPE_LABEL = { docs: 'Docs', video: 'Video', course: 'Course', practice: 'Practice', interactive: 'Interactive' };

function Resources({ resources }) {
  if (!resources?.length) return null;
  return (
    <details className="resources">
      <summary>Learning resources ({resources.length})</summary>
      <ul>
        {resources.map((r) => (
          <li key={r.url}>
            <a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a>
            <span className={`badge type-${r.type}`}>{TYPE_LABEL[r.type] || r.type}</span>
            {r.level === 'intermediate' && <span className="badge">Next step</span>}
          </li>
        ))}
      </ul>
      <p className="muted small">Links are curated by the app team, not AI. If one has moved, use the search link.</p>
    </details>
  );
}

const STATUSES = [
  ['not_started', 'Not started'],
  ['in_progress', 'In progress'],
  ['completed', 'Completed'],
];

// ---------- List + generate (/roadmaps) ----------
function RoadmapList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getRoadmaps();
      setRoadmaps(Array.isArray(data) ? data : data?.roadmaps || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Builds a roadmap from the user's most recent analysis.
  const onGenerate = async () => {
    setGenerating(true);
    setActionError('');
    try {
      const history = await getAnalysisHistory();
      const list = Array.isArray(history) ? history : history?.assessments || [];
      if (!list.length) throw new Error('Run a skill-gap analysis first, then generate a roadmap from it.');
      const latest = list[0];
      const roadmap = await createRoadmap(latest.assessmentId ?? latest.id, user.weeklyStudyHours);
      navigate(`/roadmaps/${roadmap.id}`);
    } catch (err) {
      setActionError(err.message);
      setGenerating(false);
    }
  };

  const onDelete = async (roadmap) => {
    if (!window.confirm(`Delete "${roadmap.title}"? This cannot be undone.`)) return;
    setDeletingId(roadmap.id);
    setActionError('');
    try {
      await deleteRoadmap(roadmap.id);
      setRoadmaps((prev) => prev.filter((r) => r.id !== roadmap.id));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <Loading label="Loading roadmaps…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <div className="page-head row-between">
        <div>
          <h1>Learning roadmaps</h1>
          <p>Phased plans built from your skill gaps.</p>
        </div>
        <button className="btn btn-primary" disabled={generating} onClick={onGenerate}>
          {generating ? 'Generating… this can take a few seconds' : 'Generate from latest analysis'}
        </button>
      </div>

      {actionError && <div className="form-error" role="alert">{actionError}</div>}

      {!roadmaps.length ? (
        <EmptyState title="No roadmaps yet" text="Run an analysis, then generate a roadmap from it.">
          <Link to="/assessment" className="btn btn-ghost">Rate my skills</Link>
        </EmptyState>
      ) : (
        <div className="grid grid-2">
          {roadmaps.map((r) => (
            <RoadmapCard key={r.id} roadmap={r} onDelete={onDelete} deleting={deletingId === r.id} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- One roadmap (/roadmaps/:id) ----------
function RoadmapDetail({ id }) {
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [updatingItem, setUpdatingItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRoadmap(await getRoadmap(id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onStatus = async (item, status) => {
    if (item.status === status) return;
    setUpdatingItem(item.id);
    setActionError('');
    try {
      await updateRoadmapItem(id, item.id, status);
      setRoadmap(await getRoadmap(id)); // progress is calculated by the backend
    } catch (err) {
      setActionError(err.message);
    } finally {
      setUpdatingItem(null);
    }
  };

  const onDelete = async () => {
    if (!window.confirm('Delete this roadmap? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteRoadmap(id);
      navigate('/roadmaps');
    } catch (err) {
      setActionError(err.message);
      setDeleting(false);
    }
  };

  if (loading) return <Loading label="Loading roadmap…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="stack">
      <div>
        <Link to="/roadmaps" className="small">← All roadmaps</Link>
        <h1 style={{ marginTop: '0.5rem' }}>{roadmap.title}</h1>
        <p className="muted">{roadmap.summary}</p>
      </div>

      <div className="card">
        <ProgressBar value={roadmap.progressPercent} label="Overall progress" />
        <p className="muted small" style={{ margin: '0.8rem 0 0' }}>
          {roadmap.careerName} · about {roadmap.totalWeeks} weeks at {roadmap.weeklyHours} hours per week
        </p>
      </div>

      <div className="notice">
        {roadmap.aiGenerated
          ? 'AI-generated suggestion, not a guarantee. Adjust it to fit your own pace.'
          : 'The AI was unavailable, so this plan was built from simple rules.'}
      </div>

      {actionError && <div className="form-error" role="alert">{actionError}</div>}

      {(roadmap.phases || []).map((phase) => (
        <section className="phase" key={phase.phaseNumber}>
          <div className="phase-title">
            <span className="phase-num">{phase.phaseNumber}</span>
            <h2 style={{ margin: 0 }}>{phase.title}</h2>
          </div>
          {phase.items.map((item) => (
            <div className={item.status === 'completed' ? 'card item done' : 'card item'} key={item.id}>
              <div className="row-between">
                <h3>{item.title}</h3>
                <span className="badge">{item.durationWeeks} wk</span>
              </div>
              {item.description && <p className="muted small">{item.description}</p>}
              <Resources resources={item.resources} />
              <div className="status-switch" role="group" aria-label={`Status of ${item.title}`}>
                {STATUSES.map(([value, label]) => (
                  <button key={value} className={item.status === value ? 'active' : ''}
                          disabled={updatingItem === item.id} onClick={() => onStatus(item, value)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}

      <div>
        <button className="btn btn-danger btn-sm" disabled={deleting} onClick={onDelete}>
          {deleting ? 'Deleting…' : 'Delete roadmap'}
        </button>
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  const { id } = useParams();
  return id ? <RoadmapDetail key={id} id={id} /> : <RoadmapList />;
}
