import React from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import BottomNav from './components/layout/BottomNav';
import ScrollToTop from './components/layout/ScrollToTop';
import useInactivityLogout from './hooks/useInactivityLogout';
import CommandPalette from './components/CommandPalette';
import AnnouncementBanner from './components/AnnouncementBanner';

import Home from './pages/Home';
import Login from './pages/Login';
import Chatbot from './pages/Chatbot';
import MyTickets from './pages/MyTickets';
import AdminDashboard from './pages/AdminDashboard';
import TicketDetail from './pages/TicketDetail';
import UserManagement from './pages/UserManagement';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import TicketStatus from './pages/TicketStatus';
import KnowledgeBase from './pages/KnowledgeBase';
import ActivityLog from './pages/ActivityLog';
import Survey from './pages/Survey';
import FeedbackResults from './pages/FeedbackResults';
import Announcements from './pages/Announcements';
import NotificationCenter from './pages/NotificationCenter';
import CannedResponses from './pages/CannedResponses';
import { logActivity } from './utils/activityLog';
import OnboardingTour from './components/OnboardingTour';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token') && localStorage.getItem('isAuthenticated') === 'true';
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: window.location.pathname }} replace />;
  }
  return children;
};

const AdminRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token') && localStorage.getItem('isAuthenticated') === 'true';
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (localStorage.getItem('userRole') !== 'admin') return <Navigate to="/" replace />;
  return children;
};

const StaffRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token') && localStorage.getItem('isAuthenticated') === 'true';
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!['agent', 'admin'].includes(localStorage.getItem('userRole'))) return <Navigate to="/" replace />;
  return children;
};

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname === '/login';
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const lastKeyRef = React.useRef(null);
  const lastKeyTimeRef = React.useRef(0);
  useInactivityLogout();

  // Log every page navigation for authenticated users
  React.useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated || location.pathname === '/login') return;
    logActivity('PAGE_VISITED', {
      category: 'SYSTEM',
      severity: 'info',
      detail: `Navigated to ${location.pathname}`,
      metadata: { path: location.pathname, search: location.search },
    });
  }, [location.pathname]);

  React.useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(v => !v);
      }
      // '?' shortcut — only when not typing in an input/textarea
      if (e.key === '?' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setShortcutsOpen(v => !v);
      }
      // G+A sequence shortcut → Admin Dashboard
      if (!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) {
        const now = Date.now();
        if (e.key.toLowerCase() === 'g') {
          lastKeyRef.current = 'g';
          lastKeyTimeRef.current = now;
        } else if (e.key.toLowerCase() === 'a' && lastKeyRef.current === 'g' && now - lastKeyTimeRef.current < 1000) {
          lastKeyRef.current = null;
          const role = localStorage.getItem('userRole');
          if (role === 'admin' || role === 'agent') navigate('/admin');
        } else {
          lastKeyRef.current = null;
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}>
      <Navbar />
      <AnnouncementBanner />
      <main className={`relative ${isLogin ? '' : 'pt-16 pb-16 md:pb-0'}`}>
        <div key={location.pathname} className="page-enter">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/chatbot" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
            <Route path="/raise-ticket" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
            <Route path="/my-tickets" element={<ProtectedRoute><MyTickets /></ProtectedRoute>} />
            <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />
            <Route path="/status" element={<TicketStatus />} />
            <Route path="/knowledge-base" element={<ProtectedRoute><KnowledgeBase /></ProtectedRoute>} />
            <Route path="/admin" element={<StaffRoute><AdminDashboard /></StaffRoute>} />
            <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
            <Route path="/admin/logs" element={<AdminRoute><ActivityLog /></AdminRoute>} />
            <Route path="/survey" element={<Survey />} />
            <Route path="/admin/feedback" element={<AdminRoute><FeedbackResults /></AdminRoute>} />
            <Route path="/admin/announcements" element={<AdminRoute><Announcements /></AdminRoute>} />
            <Route path="/admin/canned-responses" element={<StaffRoute><CannedResponses /></StaffRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationCenter /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
      <BottomNav />
      <ScrollToTop />
      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
      {shortcutsOpen && <KeyboardShortcutsModal onClose={() => setShortcutsOpen(false)} />}
      <OnboardingTour />
    </div>
  );
}

export default App;
