// Shared loading, error and empty states used by every page.

export default function Loading({ label = 'Loading…', fullPage = false }) {
  return (
    <div className={fullPage ? 'state state-full' : 'state'} role="status" aria-live="polite">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state state-error" role="alert">
      <div className="state-icon">!</div>
      <h3>Something went wrong</h3>
      <p>{message || 'Please try again.'}</p>
      {onRetry && (
        <button className="btn btn-ghost" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, text, children }) {
  return (
    <div className="state">
      <div className="state-icon state-icon-soft">○</div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}
