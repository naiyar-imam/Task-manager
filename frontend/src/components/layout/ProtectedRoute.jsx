import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100">
        <div className="panel w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-950" />
          <h1 className="font-display text-2xl font-bold text-zinc-950">
            Loading your workspace
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Verifying your session and restoring the dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
