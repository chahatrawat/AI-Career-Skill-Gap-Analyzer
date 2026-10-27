import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { validateRegister } from '../utils/validators.js';

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const found = validateRegister(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      await register(form);
      navigate('/careers', { replace: true }); // first step: pick a career
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fields = [
    ['name', 'Full name', 'text', 'name'],
    ['email', 'Email', 'email', 'email'],
    ['password', 'Password (min. 8 characters)', 'password', 'new-password'],
    ['confirmPassword', 'Confirm password', 'password', 'new-password'],
  ];

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={onSubmit} noValidate>
        <h1>Create your account</h1>
        <p className="muted">It takes less than a minute.</p>

        {serverError && <div className="form-error" role="alert">{serverError}</div>}

        {fields.map(([name, label, type, autoComplete]) => (
          <div className="field" key={name}>
            <label htmlFor={name}>{label}</label>
            <input id={name} name={name} type={type} className="input" autoComplete={autoComplete}
                   value={form[name]} onChange={onChange} />
            {errors[name] && <div className="field-error">{errors[name]}</div>}
          </div>
        ))}

        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>
        <p className="center muted small" style={{ marginTop: '1rem' }}>
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
