import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const FEATURES = [
  { icon: '🔐', title: 'Account & profile', text: 'Sign up, set your study hours and preferred learning style.' },
  { icon: '🎯', title: 'Career selection', text: 'Browse curated IT careers and see the skills each one needs.' },
  { icon: '★', title: 'Skill assessment', text: 'Rate yourself from 1 to 5 on the skills of your target career.' },
  { icon: '📊', title: 'AI skill-gap analysis', text: 'Get a readiness score, strengths, gaps and a plain-language explanation.' },
  { icon: '🗺️', title: 'Learning roadmap', text: 'A phased plan scaled to your weekly hours. Track every step.' },
  { icon: '📈', title: 'Dashboard', text: 'Your score, top gaps and roadmap progress in one place.' },
];

const STEPS = [
  ['01', 'Pick a career', 'Choose the IT role you are aiming for.'],
  ['02', 'Rate your skills', 'Be honest. The score is only as good as your ratings.'],
  ['03', 'See your gaps', 'Scores are calculated by the app; AI explains them.'],
  ['04', 'Follow your roadmap', 'Mark items started or completed as you learn.'],
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="landing">
      <nav className="landing-nav">
        <span className="brand">
          <span className="brand-mark">◆</span> SkillGap<span className="brand-accent">AI</span>
        </span>
        <div className="row">
          {user ? (
            <Link to="/dashboard" className="btn btn-primary btn-sm">Go to dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign up</Link>
            </>
          )}
        </div>
      </nav>

      <section className="hero">
        <h1>
          Know exactly what to learn for your <span className="gradient-text">dream IT career</span>
        </h1>
        <p>
          Compare the skills you have with the skills your target career needs, then get a personalised
          roadmap you can save and track.
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link to={user ? '/dashboard' : '/register'} className="btn btn-primary">
            {user ? 'Open dashboard' : 'Get started free'}
          </Link>
          {!user && <Link to="/login" className="btn btn-ghost">I already have an account</Link>}
        </div>
      </section>

      <h2 className="section-title">Everything you need, nothing you don’t</h2>
      <div className="grid grid-3">
        {FEATURES.map((f) => (
          <div className="card" key={f.title}>
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p className="muted">{f.text}</p>
          </div>
        ))}
      </div>

      <h2 className="section-title">How it works</h2>
      <div className="grid grid-2">
        {STEPS.map(([n, title, text]) => (
          <div className="card" key={n}>
            <span className="step-num">STEP {n}</span>
            <h3>{title}</h3>
            <p className="muted">{text}</p>
          </div>
        ))}
      </div>

      <p className="footer-note">
        Career requirements are curated baselines, not live job-market data. AI output is a suggestion, not a guarantee.
      </p>
    </div>
  );
}
