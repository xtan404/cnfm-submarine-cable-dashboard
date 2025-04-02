import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ element: Component }) => {
  const isLoggedIn = localStorage.getItem('loggedIn'); // Adjust this based on your authentication logic
  const role = localStorage.getItem('role'); // Adjust this based on your authentication logic

  if (!isLoggedIn || null) {
    return <Navigate to="/status/401" />;
  }

  if (isLoggedIn && role === 'User') {
    localStorage.setItem('loggedIn', 'false'); // Set loggedIn state to false
    return <Navigate to="/status/coming-soon" />;
  }

  return <Component />;
};

export default PrivateRoute;
