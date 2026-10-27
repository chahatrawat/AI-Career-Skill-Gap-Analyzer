import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getCareer, getCareers } from '../services/api.js';
import Loading, { EmptyState, ErrorState } from '../components/Loading.jsx';
import { LEVEL_LABELS } from '../components/SkillCard.jsx';

const IMPORTANCE = { 1: 'Low', 2: 'Medium', 3: 'High' };

export default function CareerSelectionPage() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({}); // careerId -> career with skills
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCareers(await getCareers());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCareer = async (id) => {
    setSaveError('');
    setDetailError('');
    setOpenId(id);
    if (details[id]) return;
    setDetailLoading(true);
    try {
      const career = await getCareer(id);
      setDetails((prev) => ({ ...prev, [id]: career }));
    } catch (err) {
      setDetailError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const selectCareer = async (id) => {
    setSaving(true);
    setSaveError('');
    try {
      await updateProfile({
        name: user.name,
        educationLevel: user.educationLevel || null,
        experienceLevel: user.experienceLevel || null,
        weeklyStudyHours: user.weeklyStudyHours,
        learningFormat: user.learningFormat,
        targetCareerId: id,
      });
      navigate('/assessment');
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading label="Loading careers…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!careers.length) {
    return <EmptyState title="No careers available" text="The careers list is empty. Ask the team to run seed.sql." />;
  }

  const current = openId && details[openId];

  return (
    <div>
      <div className="page-head">
        <h1>Choose your target career</h1>
        <p>Select a career to see the skills it needs, then set it as your target.</p>
      </div>

      <div className="grid grid-2">
        {careers.map((career) => {
          const isTarget = user.targetCareerId === career.id;
          return (
            <div
              key={career.id}
              className={openId === career.id ? 'card career-card selected' : 'card career-card'}
              onClick={() => openCareer(career.id)}
            >
              <div className="row-between">
                <h3>{career.name}</h3>
                {isTarget && <span className="badge">Current target</span>}
              </div>
              <p className="muted small">{career.description}</p>
            </div>
          );
        })}
      </div>

      {openId && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          {detailLoading && <Loading label="Loading required skills…" />}
          {detailError && <ErrorState message={detailError} onRetry={() => openCareer(openId)} />}
          {current && !detailLoading && (
            <>
              <h2>{current.name}: required skills</h2>
              <p className="muted small">
                Curated baselines chosen by the team, not live job-market data.
              </p>
              <div className="career-skills">
                {(current.skills || []).map((s) => (
                  <div className="career-skill-row" key={s.skillId}>
                    <span>
                      {s.name} {s.category && <span className="muted small">· {s.category}</span>}
                    </span>
                    <span className="muted">
                      {LEVEL_LABELS[s.requiredLevel] || s.requiredLevel} · {IMPORTANCE[s.importance]} importance
                    </span>
                  </div>
                ))}
              </div>
              {saveError && <div className="form-error" role="alert" style={{ marginTop: '1rem' }}>{saveError}</div>}
              <div className="row-actions">
                <button className="btn btn-primary" disabled={saving} onClick={() => selectCareer(current.id)}>
                  {saving ? 'Saving…' : user.targetCareerId === current.id ? 'Continue to skill rating' : 'Set as my target career'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
