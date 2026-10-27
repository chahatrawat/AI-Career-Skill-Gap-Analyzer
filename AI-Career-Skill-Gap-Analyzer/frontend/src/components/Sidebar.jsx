import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/careers', label: 'Choose career', icon: '◎' },
  { to: '/assessment', label: 'Rate my skills', icon: '★' },
  { to: '/analysis', label: 'Skill-gap analysis', icon: '△' },
  { to: '/quiz', label: 'Skill quiz', icon: '✓' },
  { to: '/roadmaps', label: 'Roadmaps', icon: '➜' },
  { to: '/projects', label: 'Project Lab', icon: '⚗' },
  { to: '/planner', label: 'Weekly planner', icon: '▤' },
  { to: '/profile', label: 'Profile', icon: '☺' },
];

export default function Sidebar({ open, onNavigate }) {
  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onNavigate} />}
      <aside className={open ? 'sidebar sidebar-open' : 'sidebar'}>
        <nav>
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onNavigate}
              className={({ isActive }) => (isActive ? 'side-link active' : 'side-link')}
            >
              <span className="side-icon">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
