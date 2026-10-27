import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="menu-btn" onClick={onMenuClick} aria-label="Open menu">
          ☰
        </button>
        <Link to="/dashboard" className="brand">
          <span className="brand-mark">◆</span>
          <span>SkillGap<span className="brand-accent">AI</span></span>
        </Link>
      </div>
      <div className="navbar-right">
        {user && (
          <>
            <span className="navbar-user">{user.name}</span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Log out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
