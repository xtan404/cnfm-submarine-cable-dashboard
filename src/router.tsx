import { Suspense, lazy } from 'react';
import { Navigate, RouteObject } from 'react-router-dom';

import SidebarLayout from 'src/layouts/SidebarLayout';
import BaseLayout from 'src/layouts/BaseLayout';

import SuspenseLoader from 'src/components/SuspenseLoader';
import PrivateRoute from 'src/components/PrivateRoute'; // Import the PrivateRoute component
import SimulationEnvironment from './content/environment';

const Loader = (Component) => (props) =>
  (
    <Suspense fallback={<SuspenseLoader />}>
      <Component {...props} />
    </Suspense>
  );

// Authentication
const LoginPage = Loader(
  lazy(() => import('src/content/authentication/login'))
);
const RegisterPage = Loader(
  lazy(() => import('src/content/authentication/register'))
);

// Admin Pages
const AdminDashboard = Loader(
  lazy(() => import('src/content/admin/dashboard'))
);

// Status
const Status401 = Loader(lazy(() => import('src/content/status/Status401')));
const Status404 = Loader(lazy(() => import('src/content/status/Status404')));
const Status500 = Loader(lazy(() => import('src/content/status/Status500')));
const StatusComingSoon = Loader(
  lazy(() => import('src/content/status/ComingSoon'))
);
const StatusMaintenance = Loader(
  lazy(() => import('src/content/status/Maintenance'))
);

const routes: RouteObject[] = [
  {
    path: '',
    element: <BaseLayout />,
    children: [
      { path: '/', element: <AdminDashboard /> },
      { path: '/simulation', element: <SimulationEnvironment /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      {
        path: 'status',
        children: [
          { path: '', element: <Navigate to="404" replace /> },
          { path: '404', element: <PrivateRoute element={Status404} /> },
          { path: '401', element: <Status401 /> },
          { path: '500', element: <PrivateRoute element={Status500} /> },
          {
            path: 'maintenance',
            element: <PrivateRoute element={StatusMaintenance} />
          },
          {
            path: 'coming-soon',
            element: <StatusComingSoon />
          }
        ]
      },
      { path: '*', element: <Status404 /> }
    ]
  } /*,
  {
    path: 'admin',
    element: <SidebarLayout />,
    children: [
      { path: '', element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <PrivateRoute element={AdminDashboard} /> }, // Protect this route
      { path: 'alerts', element: <PrivateRoute element={AdminAlerts} /> }, // Protect this route
      { path: 'support', element: <PrivateRoute element={AdminSupport} /> } // Protect this route
    ]
  }*/
];

export default routes;
