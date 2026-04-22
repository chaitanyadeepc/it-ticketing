import React from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err, info) { console.error('[ErrorBoundary]', err, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', backgroundColor: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '24px' }}>
          <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
          <p style={{ color: '#fafafa', fontSize: '16px', fontWeight: 600, margin: 0 }}>Something went wrong</p>
          <p style={{ color: '#71717a', fontSize: '13px', margin: 0 }}>A rendering error occurred on this page.</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '8px', padding: '8px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Reload page</button>
        </div>
      );
    }
    return this.props.children;
  }
}
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
import Reports from './pages/Reports';
import TicketPrint from './pages/TicketPrint';
import SLAConfig from './pages/SLAConfig';
import CalendarView from './pages/CalendarView';
import ScriptVault from './pages/ScriptVault';
import Kiosk from './pages/Kiosk';
import SharedTicket from './pages/SharedTicket';
import AnonymousFeedback from './pages/AnonymousFeedback';
import TicketImport from './pages/TicketImport';
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
  const isPrint = /^\/tickets\/[^/]+\/print$/.test(location.pathname);
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
    <ErrorBoundary>
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}>
      {!isPrint && <Navbar />}
      {!isPrint && <AnnouncementBanner />}
      <main className={`relative ${isLogin || isPrint ? '' : 'pt-16 pb-16 md:pb-0'}`}>
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
            <Route path="/admin/sla-config" element={<AdminRoute><SLAConfig /></AdminRoute>} />
            <Route path="/admin/script-vault" element={<AdminRoute><ScriptVault /></AdminRoute>} />
            <Route path="/script-vault" element={<ProtectedRoute><ScriptVault /></ProtectedRoute>} />
            <Route path="/reports" element={<StaffRoute><Reports /></StaffRoute>} />
            <Route path="/my-tickets/calendar" element={<ProtectedRoute><CalendarView /></ProtectedRoute>} />
            <Route path="/tickets/:id/print" element={<ProtectedRoute><TicketPrint /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationCenter /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/kiosk" element={<Kiosk />} />
            <Route path="/share/:token" element={<SharedTicket />} />
            <Route path="/feedback" element={<AnonymousFeedback />} />
            <Route path="/admin/ticket-import" element={<AdminRoute><TicketImport /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
      {!isPrint && <BottomNav />}
      {!isPrint && <ScrollToTop />}
      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
      {shortcutsOpen && <KeyboardShortcutsModal onClose={() => setShortcutsOpen(false)} />}
      <OnboardingTour />
    </div>
    </ErrorBoundary>
  );
}

export default App;
