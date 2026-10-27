export default function ProgressBar({ value = 0, label, showValue = true }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="progress">
      {(label || showValue) && (
        <div className="progress-head">
          <span>{label}</span>
          {showValue && <strong>{Math.round(pct)}%</strong>}
        </div>
      )}
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
