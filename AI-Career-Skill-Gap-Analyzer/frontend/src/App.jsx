import { useState } from 'react';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Loading from './components/Loading.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import CareerSelectionPage from './pages/CareerSelectionPage.jsx';
import SkillAssessmentPage from './pages/SkillAssessmentPage.jsx';
import SkillGapAnalysisPage from './pages/SkillGapAnalysisPage.jsx';
import RoadmapPage from './pages/RoadmapPage.jsx';
import QuizPage from './pages/QuizPage.jsx';
import ProjectLabPage from './pages/ProjectLabPage.jsx';
import PlannerPage from './pages/PlannerPage.jsx';

// Login guard: anyone without a session is sent to /login.
function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading label="Checking your session…" fullPage />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

// Navbar + sidebar shell for every logged-in page.
function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="app-shell">
      <Navbar onMenuClick={() => setMenuOpen((open) => !open)} />
      <div className="app-body">
        <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="state state-full">
      <h1>404</h1>
      <p>That page does not exist.</p>
      <Link to="/" className="btn btn-primary">
        Go home
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/careers" element={<CareerSelectionPage />} />
              <Route path="/assessment" element={<SkillAssessmentPage />} />
              <Route path="/analysis" element={<SkillGapAnalysisPage />} />
              <Route path="/analysis/:id" element={<SkillGapAnalysisPage />} />
              <Route path="/roadmaps" element={<RoadmapPage />} />
              <Route path="/roadmaps/:id" element={<RoadmapPage />} />
              <Route path="/quiz" element={<QuizPage />} />
              <Route path="/projects" element={<ProjectLabPage />} />
              <Route path="/planner" element={<PlannerPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
