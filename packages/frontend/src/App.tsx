import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./guards/ProtectedRoute.js";
import { AdminRoute } from "./guards/AdminRoute.js";
import AppShell from "./components/layout/AppShell.js";
import LoginPage from "./pages/LoginPage.js";
import DashboardPage from "./pages/DashboardPage.js";
import PaymentsPage from "./pages/PaymentsPage.js";
import ExpensesPage from "./pages/ExpensesPage.js";
import ResidentsPage from "./pages/ResidentsPage.js";
import BuildingsPage from "./pages/BuildingsPage.js";
import ManagersPage from "./pages/ManagersPage.js";
import NotificationsPage from "./pages/NotificationsPage.js";
import NotFoundPage from "./pages/NotFoundPage.js";
import { useAuth } from "./lib/auth.js";
import { PreviewProvider } from "./lib/preview.js";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <p>Chargement...</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<PreviewProvider />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/residents" element={<ResidentsPage />} />

            <Route element={<AdminRoute />}>
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/buildings" element={<BuildingsPage />} />
              <Route path="/managers" element={<ManagersPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
