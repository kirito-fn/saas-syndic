import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth.js";

export function AdminRoute() {
  const { user } = useAuth();

  if (!user || user.role !== "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
