import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { CssBaseline, LinearProgress } from "@mui/material";
import { AppThemeProvider } from "./theme/AppThemeProvider.jsx";
import { store } from "./app/store.js";
import { Shell } from "./components/Shell.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import "./styles.css";

const HomePage = lazy(() => import("./features/trains/HomePage.jsx"));
const TrainSearchResultsPage = lazy(() => import("./features/trains/TrainSearchResultsPage.jsx"));
const LoginPage = lazy(() => import("./features/auth/LoginPage.jsx"));
const RegisterPage = lazy(() => import("./features/auth/RegisterPage.jsx"));
const ForgotPasswordPage = lazy(
  () => import("./features/auth/ForgotPasswordPage.jsx"),
);
const ResetPasswordPage = lazy(
  () => import("./features/auth/ResetPasswordPage.jsx"),
);
const VerifyEmailPage = lazy(
  () => import("./features/auth/VerifyEmailPage.jsx"),
);
const BookingPage = lazy(() => import("./features/booking/BookingPage.jsx"));
const DashboardPage = lazy(
  () => import("./features/dashboard/DashboardPage.jsx"),
);
const AdminPage = lazy(() => import("./features/dashboard/AdminPage.jsx"));
const PnrPage = lazy(() => import("./features/booking/PnrPage.jsx"));
const UnlockAccountPage = lazy(
  () => import("./features/auth/UnlockAccountPage.jsx"),
);
const MyTicketsPage = lazy(() => import("./features/auth/MyTicketsPage.jsx"));
const TicketDetailsPage = lazy(
  () => import("./features/auth/TicketDetailsPage.jsx"),
);
const SupportPage = lazy(() => import("./features/auth/SupportPage.jsx"));
const ProfilePage = lazy(() => import("./components/ProfilePage.jsx"));
const AdminSupportTicketsPage = lazy(
  () => import("./features/dashboard/AdminSupportTicketsPage.jsx"),
);
const router = createBrowserRouter([
  {
    path: "/",
    element: <Shell />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "trains/search", element: <TrainSearchResultsPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "forgot-password", element: <ForgotPasswordPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> },
      { path: "verify-email", element: <VerifyEmailPage /> },
      { path: "pnr", element: <PnrPage /> },
      {
        path: "booking/:trainId",
        element: (
          <ProtectedRoute>
            <BookingPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard",
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin",
        element: (
          <ProtectedRoute role="ROLE_ADMIN">
            <AdminPage />
          </ProtectedRoute>
        ),
      },
      { path: "unlock-account", element: <UnlockAccountPage /> },
      { path: "support", element: <SupportPage /> },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "my-tickets",
        element: (
          <ProtectedRoute>
            <MyTicketsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "support/tickets/:ticketId",
        element: (
          <ProtectedRoute>
            <TicketDetailsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/support-tickets",
        element: (
          <ProtectedRoute role="ROLE_ADMIN">
            <AdminSupportTicketsPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <AppThemeProvider>
        <CssBaseline />
        <Suspense fallback={<LinearProgress />}>
          <RouterProvider router={router} />
        </Suspense>
      </AppThemeProvider>
    </Provider>
  </React.StrictMode>,
);
