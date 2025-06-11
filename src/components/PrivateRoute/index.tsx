import { Navigate } from 'react-router-dom';
import { useEffect } from 'react';

const PrivateRoute = ({ element: Component }) => {
  const isLoggedIn = localStorage.getItem('loggedIn');
  const role = localStorage.getItem('user_role');
  const sessionId = sessionStorage.getItem('sessionId');

  useEffect(() => {
    // Method 1: Use sessionStorage for session-based authentication
    // sessionStorage is cleared when the browser/tab is closed
    const handleSessionCheck = () => {
      if (!sessionId && isLoggedIn === 'true') {
        // Generate new session ID if logged in but no session exists
        const newSessionId =
          Date.now().toString() + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('sessionId', newSessionId);
      }
    };

    // Method 2: Track window/tab close events
    const handleBeforeUnload = (event) => {
      // This runs when user closes browser/tab
      // Note: Modern browsers limit what you can do here
      localStorage.setItem('loggedIn', 'false');
      sessionStorage.clear();
    };

    // Method 3: Track page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden (might be closing)
        localStorage.setItem('lastActivity', Date.now().toString());
      } else {
        // Page is visible again
        const lastActivity = localStorage.getItem('lastActivity');
        if (lastActivity) {
          const timeDiff = Date.now() - parseInt(lastActivity);
          // Auto-logout after 30 minutes of inactivity (30 * 60 * 1000 ms)
          if (timeDiff > 1800000) {
            localStorage.setItem('loggedIn', 'false');
            localStorage.removeItem('user_role');
            sessionStorage.clear();
          }
        }
      }
    };

    // Method 4: Heartbeat mechanism to detect if app is running
    const startHeartbeat = () => {
      const heartbeatInterval = setInterval(() => {
        localStorage.setItem('heartbeat', Date.now().toString());
      }, 10000); // Update every 10 seconds

      return heartbeatInterval;
    };

    // Check if session is still valid on component mount
    const checkSessionValidity = () => {
      const heartbeat = localStorage.getItem('heartbeat');
      if (heartbeat) {
        const timeSinceLastHeartbeat = Date.now() - parseInt(heartbeat);
        // If no heartbeat for more than 1 minute, consider session invalid
        if (timeSinceLastHeartbeat > 60000) {
          localStorage.setItem('loggedIn', 'false');
          localStorage.removeItem('user_role');
          sessionStorage.clear();
        }
      }
    };

    handleSessionCheck();
    checkSessionValidity();

    const heartbeatInterval = startHeartbeat();

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLoggedIn, sessionId]);

  if (!isLoggedIn || null) {
    return <Navigate to="/status/401" />;
  }

  if (isLoggedIn && role === 'User') {
    localStorage.setItem('loggedIn', 'false');
    return <Navigate to="/status/coming-soon" />;
  }

  // Additional security checks remain the same
  if (role === 'Simulator' && window.location.pathname.includes('/admin')) {
    return <Navigate to="/dashboard/simulator" replace />;
  }

  if (role === 'User' && window.location.pathname.includes('/admin')) {
    return <Navigate to="/home" replace />;
  }

  if (role === 'User' && window.location.pathname.includes('/simulator')) {
    return <Navigate to="/home" replace />;
  }

  return <Component />;
};

export default PrivateRoute;
