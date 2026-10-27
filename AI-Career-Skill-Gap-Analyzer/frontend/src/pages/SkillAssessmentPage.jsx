import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getCareer, getMySkills, runSkillGap, saveMySkills } from '../services/api.js';
import Loading, { EmptyState, ErrorState } from '../components/Loading.jsx';
import SkillCard from '../components/SkillCard.jsx';

export default function SkillAssessmentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const careerId = user.targetCareerId;

  const [career, setCareer] = useState(null);
  const [ratings, setRatings] = useState({}); // skillId -> level (1-5) or null
  const [loading, setLoading] = useState(Boolean(careerId));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(''); // '' | 'saving' | 'analysing'
  const [message, setMessage] = useState({ type: '', text: '' });

  const load = useCallback(async () => {
    if (!careerId) return;
    setLoading(true);
    setError('');
    try {
      const [careerData, saved] = await Promise.all([getCareer(careerId), getMySkills()]);
      const map = {};
      saved.forEach((s) => { map[s.skillId] = s.level; });
      setCareer(careerData);
      setRatings(map);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [careerId]);

  useEffect(() => { load(); }, [load]);

  const ratedCount = useMemo(
    () => (career?.skills || []).filter((s) => ratings[s.skillId]).length,
    [career, ratings]
  );

  const setLevel = (skillId, level) => {
    setMessage({ type: '', text: '' });
    setRatings((prev) => ({ ...prev, [skillId]: level }));
  };

  // Sends every skill of the career; level null clears a rating.
  const persist = () =>
    saveMySkills(career.skills.map((s) => ({ skillId: s.skillId, level: ratings[s.skillId] ?? null })));

  const onSave = async () => {
    setBusy('saving');
    setMessage({ type: '', text: '' });
    try {
      await persist();
      setMessage({ type: 'success', text: 'Ratings saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy('');
    }
  };

  const onAnalyse = async () => {
    if (ratedCount === 0) {
      setMessage({ type: 'error', text: 'Rate at least one skill before running the analysis.' });
      return;
    }
    setBusy('analysing');
    setMessage({ type: '', text: '' });
    try {
      await persist();
      const result = await runSkillGap(careerId);
      navigate(`/analysis/${result.assessmentId ?? result.id}`);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      setBusy('');
    }
  };

  if (!careerId) {
    return (
      <EmptyState title="Pick a target career first" text="Your ratings are based on the skills of your target career.">
        <Link to="/careers" className="btn btn-primary">Choose a career</Link>
      </EmptyState>
    );
  }
  if (loading) return <Loading label="Loading your skills…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!career?.skills?.length) {
    return <EmptyState title="No skills for this career" text="This career has no required skills yet." />;
  }

  return (
    <div>
      <div className="page-head">
        <h1>Rate your skills for {career.name}</h1>
        <p>
          Choose your honest level for each skill. <span className="legend-mark" /> marks the level the career
          needs. Skills you leave unrated count as missing.
        </p>
      </div>

      <div className="grid grid-2">
        {career.skills.map((skill) => (
          <SkillCard
            key={skill.skillId}
            skill={skill}
            value={ratings[skill.skillId] ?? null}
            onChange={(level) => setLevel(skill.skillId, level)}
            disabled={Boolean(busy)}
          />
        ))}
      </div>

      <div className="card sticky-bar">
        <div>
          <strong>{ratedCount}</strong> of {career.skills.length} skills rated
          {message.text && (
            <div className={message.type === 'error' ? 'field-error' : 'small'} role="status"
                 style={message.type === 'success' ? { color: 'var(--good)' } : undefined}>
              {message.text}
            </div>
          )}
        </div>
        <div className="row">
          <button className="btn btn-ghost" disabled={Boolean(busy)} onClick={onSave}>
            {busy === 'saving' ? 'Saving…' : 'Save ratings'}
          </button>
          <button className="btn btn-primary" disabled={Boolean(busy)} onClick={onAnalyse}>
            {busy === 'analysing' ? 'Analysing…' : 'Save & run analysis'}
          </button>
        </div>
      </div>
    </div>
  );
}
