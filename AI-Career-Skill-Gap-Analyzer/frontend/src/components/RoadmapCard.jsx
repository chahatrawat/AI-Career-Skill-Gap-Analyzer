import { Link } from 'react-router-dom';
import ProgressBar from './ProgressBar.jsx';

export default function RoadmapCard({ roadmap, onDelete, deleting = false }) {
  const { id, title, careerName, progressPercent, completedItems, totalItems, createdAt } = roadmap;
  const date = createdAt ? new Date(createdAt).toLocaleDateString() : '';

  return (
    <div className="card roadmap-card">
      <div className="roadmap-card-head">
        <div>
          <h3>{title}</h3>
          <p className="muted small">
            {careerName}
            {date && ` · Created ${date}`}
          </p>
        </div>
      </div>
      <ProgressBar value={progressPercent} label={`${completedItems ?? 0} of ${totalItems ?? 0} items done`} />
      <div className="row-actions">
        <Link to={`/roadmaps/${id}`} className="btn btn-primary btn-sm">
          Open
        </Link>
        {onDelete && (
          <button className="btn btn-ghost btn-sm" disabled={deleting} onClick={() => onDelete(roadmap)}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  );
}
