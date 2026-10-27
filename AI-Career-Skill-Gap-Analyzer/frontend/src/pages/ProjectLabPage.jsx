import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteProject, getProjects, suggestProjects, updateProjectStatus } from '../services/api.js';
import Loading, { EmptyState, ErrorState } from '../components/Loading.jsx';

const STATUS_LABEL = { suggested: 'Suggested', in_progress: 'In progress', completed: 'Completed' };
const DIFFICULTY_LABEL = { starter: 'Starter', intermediate: 'Intermediate', advanced: 'Advanced' };

export default function ProjectLabPage() {
  const [projects, setProjects] = useState([]);
  const [aiNote, setAiNote] = useState(null); // null = unknown, true/false after a suggestion
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProjects(await getProjects());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const onSuggest = async () => {
    setGenerating(true);
    setActionError('');
    try {
      const data = await suggestProjects();
      setProjects(data.projects);
      setAiNote(data.aiGenerated);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const onStatus = async (project, status) => {
    if (project.status === status) return;
    setBusyId(project.id);
    setActionError('');
    try {
      setProjects(await updateProjectStatus(project.id, status));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (project) => {
    if (!window.confirm(`Remove "${project.title}"?`)) return;
    setBusyId(project.id);
    setActionError('');
    try {
      await deleteProject(project.id);
      setProjects((list) => list.filter((p) => p.id !== project.id));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading label="Loading your projects…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1>AI Project Lab</h1>
          <p>Hands-on projects chosen to close your biggest skill gaps.</p>
        </div>
        <button className="btn btn-primary" disabled={generating} onClick={onSuggest}>
          {generating ? 'Thinking… this can take a few seconds' : projects.length ? 'Suggest new projects' : 'Suggest projects'}
        </button>
      </div>

      {aiNote !== null && (
        <div className="notice">
          {aiNote
            ? 'AI-generated suggestions, not a guarantee. Difficulty and hours are calculated from your gaps.'
            : 'The AI was unavailable, so these ideas came from simple templates. Difficulty and hours are calculated from your gaps.'}
        </div>
      )}
      {actionError && (
        <div className="form-error" role="alert">
          {actionError}{' '}
          {/analysis/i.test(actionError) && <Link to="/assessment">Rate my skills</Link>}
        </div>
      )}

      {!projects.length ? (
        <EmptyState title="No projects yet" text="Run a skill-gap analysis, then ask the lab for projects that practise your missing skills." />
      ) : (
        <div className="stack">
          {projects.map((p) => (
            <div className={p.status === 'completed' ? 'card item done' : 'card item'} key={p.id}>
              <div className="row-between">
                <h3>{p.title}</h3>
                <div className="row">
                  <span className={`badge diff-${p.difficulty}`}>{DIFFICULTY_LABEL[p.difficulty]}</span>
                  <span className="badge">≈ {p.estimatedHours} h</span>
                </div>
              </div>
              <p>{p.description}</p>
              <div className="chips" aria-label="Skills practised">
                {p.skills.map((s) => <span className="badge" key={s.id}>{s.name}</span>)}
              </div>
              <h4 style={{ marginTop: '0.9rem' }}>Deliverables</h4>
              <ul className="deliverables">
                {p.deliverables.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
              <div className="row-between" style={{ marginTop: '0.8rem' }}>
                <div className="status-switch" role="group" aria-label={`Status of ${p.title}`}>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <button key={value} className={p.status === value ? 'active' : ''}
                            disabled={busyId === p.id} onClick={() => onStatus(p, value)}>
                      {label}
                    </button>
                  ))}
                </div>
                <button className="btn btn-danger btn-sm" disabled={busyId === p.id} onClick={() => onDelete(p)}>Remove</button>
              </div>
            </div>
          ))}
          <p className="muted small">Suggesting new projects replaces ideas you have not started; projects you started or finished stay.</p>
        </div>
      )}
    </div>
  );
}
