import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { C3Logo, TopHeaderLogos } from './Logos.jsx';

export default function Navbar({ contestId }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const currentContestId = contestId || 'active';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <TopHeaderLogos height={38} />
      <header className="app-navbar">
        <div className="navbar-container">
          <Link to="/dashboard" className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <C3Logo height={34} showSubtitle={false} />
            <span className="brand-text" style={{ fontSize: '1.25rem', fontWeight: '800' }}>
              C³ <span className="brand-highlight" style={{ fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', color: '#93c5fd' }}>HDL Arena</span>
            </span>
          </Link>

        <nav className="navbar-menu">
          <Link
            to="/dashboard"
            className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
          >
            📊 Dashboard
          </Link>
          <Link
            to={`/contest/${currentContestId}`}
            className={`nav-item ${location.pathname.startsWith('/contest') ? 'active' : ''}`}
          >
            ⚡ Contest Arena
          </Link>
          <Link
            to={`/leaderboard/${currentContestId}`}
            className={`nav-item ${location.pathname.startsWith('/leaderboard') || location.pathname.startsWith('/results') ? 'active' : ''}`}
          >
            🏆 Leaderboard
          </Link>
          {(user.role === 'admin' || user.role === 'judge') && (
            <Link
              to={`/admin/${currentContestId}`}
              className={`nav-item nav-admin ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
            >
              ⚙️ Admin Panel
            </Link>
          )}
        </nav>

        <div className="navbar-user">
          <div className="user-info">
            <span className="user-id">ID: {user.participantId}</span>
            <span className={`role-badge role-${user.role}`}>{user.role}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            Logout
          </button>
        </div>
      </div>
    </header>
  </>
  );
}
