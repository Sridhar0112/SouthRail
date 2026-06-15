import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { CssBaseline, LinearProgress } from '@mui/material';
import { AppThemeProvider } from './theme/AppThemeProvider.jsx';
import { store } from './app/store.js';
import { Shell } from './components/Shell.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import './styles.css';
import SupportPage from './features/auth/SupportPage.jsx';
import ProfilePage from './components/ProfilePage.jsx';

const HomePage = lazy(() => import('./features/trains/HomePage.jsx'));
const LoginPage = lazy(() => import('./features/auth/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('./features/auth/ResetPasswordPage.jsx'));
const VerifyEmailPage = lazy(() => import('./features/auth/VerifyEmailPage.jsx'));
const BookingPage = lazy(() => import('./features/booking/BookingPage.jsx'));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage.jsx'));
const AdminPage = lazy(() => import('./features/dashboard/AdminPage.jsx'));
const PnrPage = lazy(() => import('./features/booking/PnrPage.jsx'));
const UnlockAccountPage = lazy(
  () => import('./features/auth/UnlockAccountPage.jsx')
);
const support= lazy(()=>import('./features/auth/SupportPage.jsx'));
const profile=lazy(()=>import('./components/ProfilePage.jsx'))
const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      { path: 'pnr', element: <PnrPage /> },
      { path: 'booking/:trainId', element: <ProtectedRoute><BookingPage /></ProtectedRoute> },
      { path: 'dashboard', element: <ProtectedRoute><DashboardPage /></ProtectedRoute> },
      { path: 'admin', element: <ProtectedRoute role="ROLE_ADMIN"><AdminPage /></ProtectedRoute> },
      { path: 'unlock-account', element: <UnlockAccountPage /> },
      {path:'support',element:<SupportPage/>},
      {path:'profile',element:<ProfilePage/>}
    ]
  }
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <AppThemeProvider>
        <CssBaseline />
        <Suspense fallback={<LinearProgress />}>
          <RouterProvider router={router} />
        </Suspense>
      </AppThemeProvider>
    </Provider>
  </React.StrictMode>
);
