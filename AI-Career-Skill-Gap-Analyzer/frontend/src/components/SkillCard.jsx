// One skill with a 1-5 rating selector. value is a number 1-5 or null (not rated).

export const LEVEL_LABELS = {
  1: 'Beginner',
  2: 'Basic',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

const LEVEL_HINTS = {
  1: 'Knows the basic ideas',
  2: 'Can complete guided tasks',
  3: 'Works independently on common tasks',
  4: 'Handles complex tasks confidently',
  5: 'Deep, broad expertise',
};

const IMPORTANCE = { 1: 'Low', 2: 'Medium', 3: 'High' };

export default function SkillCard({ skill, value, onChange, disabled = false }) {
  const { name, category, requiredLevel, importance } = skill;

  return (
    <div className="card skill-card">
      <div className="skill-card-head">
        <div>
          <h3>{name}</h3>
          {category && <span className="muted small">{category}</span>}
        </div>
        <div className="skill-badges">
          <span className="badge">Needs: {LEVEL_LABELS[requiredLevel] || requiredLevel}</span>
          <span className={`badge badge-imp-${importance}`}>
            {IMPORTANCE[importance] || '—'} importance
          </span>
        </div>
      </div>

      <div className="level-row" role="radiogroup" aria-label={`Your level in ${name}`}>
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={value === level}
            disabled={disabled}
            className={[
              'level-btn',
              value === level ? 'selected' : '',
              level === requiredLevel ? 'required' : '',
            ].join(' ')}
            onClick={() => onChange(level)}
            title={`${LEVEL_LABELS[level]}: ${LEVEL_HINTS[level]}`}
          >
            {level}
          </button>
        ))}
        <button
          type="button"
          className="level-clear"
          disabled={disabled || value == null}
          onClick={() => onChange(null)}
        >
          Clear
        </button>
      </div>

      <p className="small muted level-hint">
        {value ? `${LEVEL_LABELS[value]} · ${LEVEL_HINTS[value]}` : 'Not rated yet'}
      </p>
    </div>
  );
}
