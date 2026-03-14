import { useEffect, useRef } from 'react';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

/**
 * Automatically logs out the user after INACTIVITY_TIMEOUT ms of no activity.
 * Only active when the user is authenticated (token in localStorage).
 * On logout, redirects to /login?reason=inactivity.
 */
const useInactivityLogout = () => {
  const timerRef = useRef(null);

  useEffect(() => {
    const isAuth = () =>
      !!localStorage.getItem('token') && localStorage.getItem('isAuthenticated') === 'true';

    if (!isAuth()) return;

    const logout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      window.location.href = '/login?reason=inactivity';
    };

    const resetTimer = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logout, INACTIVITY_TIMEOUT);
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, []);
};

export default useInactivityLogout;
