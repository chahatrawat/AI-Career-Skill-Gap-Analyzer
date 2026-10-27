import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard } from '../services/api.js';
import Loading, { EmptyState, ErrorState } from '../components/Loading.jsx';
import RoadmapCard from '../components/RoadmapCard.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import { CategoryBars, SkillComparisonChart, TrendLine } from '../components/charts.jsx';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getDashboard());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading label="Loading your dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const {
    user, latestAssessment: latest, readinessHistory = [], roadmaps = [],
    skillComparison = [], categoryReadiness = [], projects, weeklyProgress: week, quizzes,
  } = data;
  const target = user?.targetCareer;

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Hi {user?.name?.split(' ')[0] || 'there'} 👋</h1>
        <p>
          {target ? <>Target career: <strong>{target.name}</strong> · <Link to="/careers">change</Link></> : 'Pick a target career to get started.'}
        </p>
      </div>

      {!target && (
        <EmptyState title="No target career yet" text="Choose the IT career you are aiming for.">
          <Link to="/careers" className="btn btn-primary">Choose a career</Link>
        </EmptyState>
      )}

      {target && !latest && (
        <EmptyState title="No analysis yet" text="Rate your skills and run your first skill-gap analysis.">
          <Link to="/assessment" className="btn btn-primary">Rate my skills</Link>
        </EmptyState>
      )}

      {latest && (
        <div className="grid grid-2">
          <div className="card">
            <h2>Readiness score</h2>
            <div className="row" style={{ gap: '1.5rem', marginTop: '0.75rem' }}>
              <div className="score-ring" style={{ '--pct': latest.readinessScore }}>
                <span>{Number(latest.readinessScore).toFixed(1)}<small>%</small></span>
              </div>
              <div className="counts" style={{ flex: 1 }}>
                <div className="count-box"><strong style={{ color: 'var(--good)' }}>{latest.counts?.met ?? 0}</strong>Met</div>
                <div className="count-box"><strong style={{ color: 'var(--warn)' }}>{latest.counts?.gap ?? 0}</strong>Gaps</div>
                <div className="count-box"><strong style={{ color: 'var(--bad)' }}>{latest.counts?.missing ?? 0}</strong>Missing</div>
              </div>
            </div>
            <div className="row-actions">
              <Link to={`/analysis/${latest.id}`} className="btn btn-ghost btn-sm">View analysis</Link>
              <Link to="/assessment" className="btn btn-ghost btn-sm">Update ratings</Link>
            </div>
          </div>

          <div className="card">
            <h2>Top gaps</h2>
            {latest.topGaps?.length ? (
              latest.topGaps.map((g) => (
                <div className="history-row" key={g.skillId}>
                  <strong>{g.name}</strong>
                  <span className="status status-gap">{g.gap} level{g.gap === 1 ? '' : 's'} to go</span>
                </div>
              ))
            ) : (
              <p className="muted">No gaps. You meet every requirement.</p>
            )}
          </div>
        </div>
      )}

      {latest && skillComparison.length > 0 && (
        <div className="card">
          <div className="row-between">
            <h2>Skills vs. what {target?.name || 'the career'} needs</h2>
            <Link to="/quiz" className="btn btn-ghost btn-sm">Prove it with a quiz</Link>
          </div>
          <SkillComparisonChart skills={skillComparison} />
        </div>
      )}

      {latest && (
        <div className="grid grid-2">
          <div className="card">
            <h2>Readiness by category</h2>
            <CategoryBars categories={categoryReadiness} />
          </div>
          <div className="card">
            <h2>Readiness over time</h2>
            {readinessHistory.length > 1 ? (
              <TrendLine points={readinessHistory} />
            ) : (
              <p className="muted">Run the analysis again after updating your ratings to see your trend.</p>
            )}
          </div>
        </div>
      )}

      {latest && (
        <div className="grid grid-3">
          <div className="card">
            <h2>This week</h2>
            <ProgressBar value={week?.goalPercent ?? 0} label="Study goal" />
            <p className="muted small" style={{ margin: '0.6rem 0 0' }}>
              {Math.round((week?.completedMinutes ?? 0) / 6) / 10} of {Math.round((week?.targetMinutes ?? 0) / 6) / 10} hours
              · {week?.streakDays ?? 0}-day streak
            </p>
            <div className="row-actions"><Link to="/planner" className="btn btn-ghost btn-sm">Open planner</Link></div>
          </div>
          <div className="card">
            <h2>Project Lab</h2>
            <p className="stat-line"><strong>{projects?.completed ?? 0}</strong> completed · <strong>{projects?.inProgress ?? 0}</strong> in progress</p>
            <p className="muted small" style={{ margin: 0 }}>{projects?.suggested ?? 0} suggestions waiting</p>
            <div className="row-actions"><Link to="/projects" className="btn btn-ghost btn-sm">Open lab</Link></div>
          </div>
          <div className="card">
            <h2>Quiz evidence</h2>
            <p className="stat-line"><strong>{skillComparison.filter((s) => s.quizLevel != null).length}</strong> of {skillComparison.length} skills tested</p>
            <p className="muted small" style={{ margin: 0 }}>Quizzes back up your self-ratings with proof.</p>
            <div className="row-actions"><Link to="/quiz" className="btn btn-ghost btn-sm">Take a quiz</Link></div>
          </div>
        </div>
      )}

      {latest && (
        <div>
          <div className="row-between" style={{ marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0 }}>Your roadmaps</h2>
            <Link to="/roadmaps" className="small">See all</Link>
          </div>
          {roadmaps.length ? (
            <div className="grid grid-2">
              {roadmaps.map((r) => <RoadmapCard key={r.id} roadmap={r} />)}
            </div>
          ) : (
            <EmptyState title="No roadmap yet" text="Turn your gaps into a step-by-step plan.">
              <Link to="/roadmaps" className="btn btn-primary">Create a roadmap</Link>
            </EmptyState>
          )}
        </div>
      )}
    </div>
  );
}
