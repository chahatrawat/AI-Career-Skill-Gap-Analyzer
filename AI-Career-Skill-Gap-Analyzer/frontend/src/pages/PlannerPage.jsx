import { useCallback, useEffect, useState } from 'react';
import {
  autoPlanWeek, createStudySession, deleteStudySession, getPlannerItems, getPlannerWeek,
  updateStudySession,
} from '../services/api.js';
import Loading, { ErrorState } from '../components/Loading.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import { WeeklyBars } from '../components/charts.jsx';

const addDays = (ymd, n) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const dayName = (ymd) => new Date(`${ymd}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const hours = (m) => `${Math.round((m / 60) * 10) / 10} h`;

function SessionRow({ session, busy, onChange, onDelete }) {
  const [actual, setActual] = useState(session.completedMinutes);
  useEffect(() => { setActual(session.completedMinutes); }, [session.completedMinutes]);
  return (
    <div className={`session session-${session.status}`}>
      <div className="session-main">
        <strong>{session.title}</strong>
        <span className="muted small">{session.plannedMinutes} min planned</span>
      </div>
      <div className="session-actions">
        {session.status === 'done' && (
          <label className="small muted">
            Actual{' '}
            <input className="input input-mini" type="number" min="0" max="600" value={actual}
                   disabled={busy} onChange={(e) => setActual(e.target.value)}
                   onBlur={() => {
                     const n = Number(actual);
                     if (Number.isInteger(n) && n >= 0 && n <= 600 && n !== session.completedMinutes) onChange({ completedMinutes: n });
                     else setActual(session.completedMinutes);
                   }} /> min
          </label>
        )}
        <div className="status-switch" role="group" aria-label={`Status of ${session.title}`}>
          {[['planned', 'Planned'], ['done', 'Done'], ['skipped', 'Skipped']].map(([value, label]) => (
            <button key={value} className={session.status === value ? 'active' : ''} disabled={busy}
                    onClick={() => session.status !== value && onChange({ status: value })}>{label}</button>
          ))}
          <button disabled={busy} onClick={onDelete} aria-label={`Delete ${session.title}`}>✕</button>
        </div>
      </div>
    </div>
  );
}

export default function PlannerPage() {
  const [week, setWeek] = useState(null);
  const [weekStart, setWeekStart] = useState(undefined); // undefined = current week
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [planning, setPlanning] = useState(false);
  const [form, setForm] = useState({ title: '', itemId: '', date: '', minutes: 45 });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await getPlannerWeek(weekStart);
      setWeek(data);
      setForm((f) => (f.date && data.days.some((d) => d.date === f.date) ? f : { ...f, date: data.days.some((d) => d.date === data.today) ? data.today : data.weekStart }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { getPlannerItems().then(setItems).catch(() => setItems([])); }, []);

  const run = async (fn) => {
    setActionError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const onAdd = async (e) => {
    e.preventDefault();
    const linked = items.find((i) => String(i.id) === form.itemId);
    const title = form.title.trim() || linked?.title || '';
    if (!title) { setActionError('Give the session a title or pick a roadmap item.'); return; }
    setAdding(true);
    await run(() => createStudySession({
      title, plannedDate: form.date, plannedMinutes: Number(form.minutes),
      ...(linked ? { roadmapItemId: linked.id } : {}),
    }));
    setForm((f) => ({ ...f, title: '', itemId: '' }));
    setAdding(false);
  };

  const onAutoPlan = async () => {
    setPlanning(true);
    await run(() => autoPlanWeek(week.weekStart));
    setPlanning(false);
  };

  const shift = (n) => { setLoading(true); setWeekStart(addDays(week.weekStart, 7 * n)); };

  if (loading && !week) return <Loading label="Loading your week…" />;
  if (error && !week) return <ErrorState message={error} onRetry={load} />;

  const s = week.summary;
  const isCurrent = week.weekStart <= week.today && week.today <= week.weekEnd;
  const label = `${dayName(week.weekStart)} – ${dayName(week.weekEnd)}`;

  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1>Weekly study planner</h1>
          <p>Plan sessions, tick them off and watch your hours add up.</p>
        </div>
        <button className="btn btn-primary" disabled={planning} onClick={onAutoPlan}>
          {planning ? 'Planning…' : isCurrent ? 'Auto-plan this week' : 'Auto-plan shown week'}
        </button>
      </div>

      {actionError && <div className="form-error" role="alert">{actionError}</div>}

      <div className="card">
        <div className="row-between" style={{ marginBottom: '1rem' }}>
          <div className="row">
            <button className="btn btn-ghost btn-sm" onClick={() => shift(-1)} aria-label="Previous week">←</button>
            <strong>{label}</strong>
            <button className="btn btn-ghost btn-sm" onClick={() => shift(1)} aria-label="Next week">→</button>
            {!isCurrent && <button className="btn btn-ghost btn-sm" onClick={() => { setLoading(true); setWeekStart(undefined); }}>This week</button>}
          </div>
          <span className="badge">🔥 {week.streakDays}-day streak</span>
        </div>
        <div className="grid grid-3">
          <div><ProgressBar value={s.goalPercent} label={`Weekly goal (${hours(s.targetMinutes)})`} />
            <p className="muted small" style={{ margin: '0.4rem 0 0' }}>{hours(s.completedMinutes)} done</p></div>
          <div><ProgressBar value={s.completionPercent} label="Planned sessions finished" />
            <p className="muted small" style={{ margin: '0.4rem 0 0' }}>{hours(s.completedMinutes)} of {hours(s.plannedMinutes)} planned</p></div>
          <div className="count-box"><strong>{s.sessionsDone}/{s.sessionsTotal}</strong>sessions done</div>
        </div>
      </div>

      <form className="card planner-form" onSubmit={onAdd}>
        <h2>Add a session</h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="ps-item">Roadmap item (optional)</label>
            <select id="ps-item" className="input" value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })}>
              <option value="">— none —</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ps-title">Title</label>
            <input id="ps-title" className="input" maxLength={200} placeholder={items.find((i) => String(i.id) === form.itemId)?.title || 'What will you study?'}
                   value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="ps-date">Day</label>
            <select id="ps-date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}>
              {week.days.map((d) => <option key={d.date} value={d.date}>{dayName(d.date)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ps-min">Minutes</label>
            <input id="ps-min" className="input" type="number" min="10" max="600" step="5" value={form.minutes}
                   onChange={(e) => setForm({ ...form, minutes: e.target.value })} />
          </div>
        </div>
        <button className="btn btn-ghost" type="submit" disabled={adding}>{adding ? 'Adding…' : 'Add session'}</button>
      </form>

      <div className="week-grid">
        {week.days.map((d) => (
          <div className={d.date === week.today ? 'card day today' : 'card day'} key={d.date}>
            <h3>{dayName(d.date)}{d.date === week.today && <span className="badge" style={{ marginLeft: '0.5rem' }}>Today</span>}</h3>
            {d.sessions.length === 0 && <p className="muted small">Nothing planned.</p>}
            {d.sessions.map((sess) => (
              <SessionRow key={sess.id} session={sess} busy={busyId === sess.id}
                onChange={async (change) => { setBusyId(sess.id); await run(() => updateStudySession(sess.id, change)); setBusyId(null); }}
                onDelete={async () => { setBusyId(sess.id); await run(() => deleteStudySession(sess.id)); setBusyId(null); }} />
            ))}
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Last 8 weeks</h2>
        <WeeklyBars weeks={week.history} targetMinutes={s.targetMinutes} />
      </div>
    </div>
  );
}
