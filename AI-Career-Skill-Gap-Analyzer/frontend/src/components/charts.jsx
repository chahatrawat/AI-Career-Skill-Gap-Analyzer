// Small dependency-free charts. Colours come from CSS variables (see index.css),
// every chart has a legend when it shows two or more series, and the skill chart
// can be switched to a table so nothing depends on colour alone.
import { useState } from 'react';

export function Legend({ items }) {
  return (
    <ul className="legend" aria-label="Chart legend">
      {items.map((item) => (
        <li key={item.label}>
          <span className={`legend-swatch legend-${item.kind || 'bar'}`} style={{ '--c': item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

const pctOfScale = (level) => `${(Math.max(0, Math.min(5, level)) / 5) * 100}%`;

/** Your level vs the required level (and the quiz estimate when there is one), per skill. */
export function SkillComparisonChart({ skills }) {
  const [asTable, setAsTable] = useState(false);
  const hasQuiz = skills.some((s) => s.quizLevel != null);
  const sorted = [...skills].sort(
    (a, b) => b.importance - a.importance || a.name.localeCompare(b.name)
  );

  const legend = [
    { label: 'Your rating', color: 'var(--series-1)' },
    ...(hasQuiz ? [{ label: 'Quiz estimate', color: 'var(--series-2)', kind: 'dot' }] : []),
    { label: 'Required level', color: 'var(--text)', kind: 'tick' },
  ];

  return (
    <div>
      <div className="row-between chart-tools">
        <Legend items={legend} />
        <button className="btn btn-ghost btn-sm" onClick={() => setAsTable((v) => !v)}>
          {asTable ? 'Show chart' : 'Show as table'}
        </button>
      </div>

      {asTable ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Skill</th><th>Your level</th>{hasQuiz && <th>Quiz</th>}<th>Required</th><th>Status</th></tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.skillId}>
                  <td>{s.name}</td>
                  <td>{s.currentLevel ?? 'Not rated'}</td>
                  {hasQuiz && <td>{s.quizLevel ?? '–'}</td>}
                  <td>{s.requiredLevel}</td>
                  <td><span className={`status status-${s.status}`}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="skill-chart" role="img"
             aria-label="Bar chart comparing your skill levels with the levels the career requires. A table view is available.">
          {sorted.map((s) => {
            const title = `${s.name}: you ${s.currentLevel ?? 'not rated'}${s.quizLevel != null ? `, quiz ${s.quizLevel}` : ''}, required ${s.requiredLevel}`;
            return (
              <div className="sc-row" key={s.skillId} title={title}>
                <span className="sc-name">{s.name}</span>
                <div className="sc-track">
                  <div className={`sc-fill sc-${s.status}`} style={{ width: pctOfScale(s.currentLevel ?? 0) }} />
                  {s.quizLevel != null && <span className="sc-quiz" style={{ left: pctOfScale(s.quizLevel) }} />}
                  <span className="sc-required" style={{ left: pctOfScale(s.requiredLevel) }} />
                </div>
                <span className="sc-value">{s.currentLevel ?? '–'}/{s.requiredLevel}</span>
              </div>
            );
          })}
          <div className="sc-scale" aria-hidden="true">
            <span />
            <div className="sc-ticks">
              {[0, 1, 2, 3, 4, 5].map((n) => <span key={n} style={{ left: pctOfScale(n) }}>{n}</span>)}
            </div>
            <span />
          </div>
        </div>
      )}
    </div>
  );
}

/** Horizontal bars, 0 to 100, one per category. */
export function CategoryBars({ categories }) {
  return (
    <div className="cat-bars">
      {categories.map((c) => (
        <div className="cat-row" key={c.category} title={`${c.category}: ${c.readinessScore}% (${c.skillCount} skills)`}>
          <span className="cat-name">{c.category}</span>
          <div className="cat-track" role="progressbar" aria-valuemin={0} aria-valuemax={100}
               aria-valuenow={Math.round(c.readinessScore)} aria-label={`${c.category} readiness`}>
            <div className="cat-fill" style={{ width: `${c.readinessScore}%` }} />
          </div>
          <strong className="cat-value">{Math.round(c.readinessScore)}%</strong>
        </div>
      ))}
    </div>
  );
}

/** Readiness over time: a single line with points, y axis 0 to 100. */
export function TrendLine({ points }) {
  const [hover, setHover] = useState(null);
  const W = 560;
  const H = 180;
  const pad = { l: 36, r: 16, t: 12, b: 28 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const x = (i) => pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v) => pad.t + innerH - (Math.max(0, Math.min(100, v)) / 100) * innerH;
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.readinessScore).toFixed(1)}`).join(' ');
  const fmt = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const active = hover === null ? null : points[hover];

  return (
    <div className="trend">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Line chart of readiness score over time"
           onMouseLeave={() => setHover(null)}>
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} className="grid-line" />
            <text x={pad.l - 6} y={y(g) + 4} textAnchor="end" className="axis-text">{g}</text>
          </g>
        ))}
        <path d={path} className="trend-line" />
        {points.map((p, i) => (
          <g key={p.assessmentId}>
            <circle cx={x(i)} cy={y(p.readinessScore)} r={5} className="trend-dot" />
            {/* larger invisible hit target */}
            <circle cx={x(i)} cy={y(p.readinessScore)} r={16} fill="transparent"
                    onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0}
                    aria-label={`${fmt(p.createdAt)}: ${Number(p.readinessScore).toFixed(1)}%`} />
            {(i === 0 || i === points.length - 1 || points.length <= 6) && (
              <text x={x(i)} y={H - 8} textAnchor="middle" className="axis-text">{fmt(p.createdAt)}</text>
            )}
          </g>
        ))}
        {active && (
          <text x={x(hover)} y={y(active.readinessScore) - 12} textAnchor="middle" className="trend-tip">
            {Number(active.readinessScore).toFixed(1)}%
          </text>
        )}
      </svg>
    </div>
  );
}

/** Planned vs completed minutes for recent weeks (two series, so a legend is shown). */
export function WeeklyBars({ weeks, targetMinutes }) {
  const max = Math.max(60, targetMinutes || 0, ...weeks.map((w) => Math.max(w.plannedMinutes, w.completedMinutes)));
  const hours = (m) => `${Math.round((m / 60) * 10) / 10} h`;
  const label = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return (
    <div>
      <Legend items={[
        { label: 'Planned', color: 'var(--series-3)' },
        { label: 'Completed', color: 'var(--series-1)' },
        ...(targetMinutes ? [{ label: 'Weekly goal', color: 'var(--text)', kind: 'tick' }] : []),
      ]} />
      <div className="wk-chart" role="img" aria-label="Planned and completed study hours per week">
        <div className="wk-plot">
          {targetMinutes > 0 && <div className="wk-goal" style={{ bottom: `${(targetMinutes / max) * 100}%` }} />}
          {weeks.map((w) => (
            <div className="wk-col" key={w.weekStart} title={`Week of ${label(w.weekStart)}: planned ${hours(w.plannedMinutes)}, completed ${hours(w.completedMinutes)}`}>
              <div className="wk-bar wk-planned" style={{ height: `${(w.plannedMinutes / max) * 100}%` }} />
              <div className="wk-bar wk-done" style={{ height: `${(w.completedMinutes / max) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="wk-labels">
          {weeks.map((w) => <span className="wk-label" key={w.weekStart}>{label(w.weekStart)}</span>)}
        </div>
      </div>
    </div>
  );
}
