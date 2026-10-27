import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { validateProfile } from '../utils/validators.js';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: user.name || '',
    educationLevel: user.educationLevel || '',
    experienceLevel: user.experienceLevel || '',
    weeklyStudyHours: user.weeklyStudyHours ?? 5,
    learningFormat: user.learningFormat || 'mixed',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const onChange = (e) => {
    setSaved(false);
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSaved(false);
    const found = validateProfile(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await updateProfile({
        name: form.name.trim(),
        educationLevel: form.educationLevel.trim() || null,
        experienceLevel: form.experienceLevel || null,
        weeklyStudyHours: Number(form.weeklyStudyHours),
        learningFormat: form.learningFormat,
        targetCareerId: user.targetCareerId, // keep the current target career
      });
      setSaved(true);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Your profile</h1>
        <p>Your study hours are used to size your roadmap.</p>
      </div>

      <form className="card stack" onSubmit={onSubmit} noValidate style={{ maxWidth: 620 }}>
        {serverError && <div className="form-error" role="alert">{serverError}</div>}
        {saved && <div className="form-success" role="status">Profile saved.</div>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" className="input" value={user.email || ''} disabled />
        </div>

        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" className="input" value={form.name} onChange={onChange} />
          {errors.name && <div className="field-error">{errors.name}</div>}
        </div>

        <div className="field">
          <label htmlFor="educationLevel">Education level</label>
          <input id="educationLevel" name="educationLevel" className="input"
                 placeholder="e.g. Diploma in IT, 5th semester"
                 value={form.educationLevel} onChange={onChange} />
          {errors.educationLevel && <div className="field-error">{errors.educationLevel}</div>}
        </div>

        <div className="grid grid-2">
          <div className="field">
            <label htmlFor="experienceLevel">Experience level</label>
            <select id="experienceLevel" name="experienceLevel" className="input"
                    value={form.experienceLevel} onChange={onChange}>
              <option value="">Prefer not to say</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="learningFormat">Preferred learning format</label>
            <select id="learningFormat" name="learningFormat" className="input"
                    value={form.learningFormat} onChange={onChange}>
              <option value="video">Video</option>
              <option value="reading">Reading</option>
              <option value="practice">Hands-on practice</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="weeklyStudyHours">Weekly study hours (1–60)</label>
          <input id="weeklyStudyHours" name="weeklyStudyHours" type="number" min="1" max="60"
                 className="input" value={form.weeklyStudyHours} onChange={onChange} />
          {errors.weeklyStudyHours && <div className="field-error">{errors.weeklyStudyHours}</div>}
        </div>

        <p className="muted small">
          Target career: <strong>{user.targetCareer?.name || (user.targetCareerId ? 'Selected' : 'Not selected')}</strong>{' '}
          · <Link to="/careers">change</Link>
        </p>

        <button className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}
