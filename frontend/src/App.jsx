import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Contest from './pages/Contest.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import AdminPanel from './pages/AdminPanel.jsx';

const ACTIVE_CONTEST_ID = import.meta.env.VITE_DEFAULT_CONTEST_ID || 'active';

function LayoutWrapper({ children, contestId }) {
  return (
    <>
      <Navbar contestId={contestId || ACTIVE_CONTEST_ID} />
      <main className="app-main">{children}</main>
    </>
  );
}

function PrivateRoute({ children, roles, contestId }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading" style={{ padding: '3rem', textAlign: 'center' }}>Loading Arena…</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return <LayoutWrapper contestId={contestId}>{children}</LayoutWrapper>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={
            <PrivateRoute contestId={ACTIVE_CONTEST_ID}><Dashboard contestId={ACTIVE_CONTEST_ID} /></PrivateRoute>
          } />
          <Route path="/contest/:contestId" element={
            <PrivateRoute><Contest /></PrivateRoute>
          } />
          <Route path="/leaderboard/:contestId" element={
            <PrivateRoute><Leaderboard /></PrivateRoute>
          } />
          <Route path="/results/:contestId" element={
            <PrivateRoute><Leaderboard /></PrivateRoute>
          } />
          <Route path="/admin/:contestId" element={
            <PrivateRoute roles={['admin', 'judge']}><AdminPanel /></PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
