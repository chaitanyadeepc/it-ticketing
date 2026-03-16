import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import BottomNav from './components/layout/BottomNav';
import ScrollToTop from './components/layout/ScrollToTop';
import useInactivityLogout from './hooks/useInactivityLogout';
import CommandPalette from './components/CommandPalette';

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
import { logActivity } from './utils/activityLog';

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
  const isLogin = location.pathname === '/login';
  const [cmdOpen, setCmdOpen] = React.useState(false);
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
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}>
      <Navbar />
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
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
      <BottomNav />
      <ScrollToTop />
      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
    </div>
  );
}

export default App;
