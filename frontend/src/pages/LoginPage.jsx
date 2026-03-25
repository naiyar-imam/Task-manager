import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(form);
      const destination = location.state?.from?.pathname || "/dashboard";
      navigate(destination, { replace: true });
    } catch (submitError) {
      setError(
        submitError?.response?.data?.detail ||
          "Login failed. Please confirm your username and password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-black/10 bg-white/90 shadow-elevation backdrop-blur-xl lg:grid-cols-[1.15fr,0.85fr]">
        <div className="relative hidden bg-dashboard-sheen p-10 lg:block">
          <div className="max-w-xl">
            <p className="eyebrow">AI-Powered Task Management Dashboard</p>
            <h1 className="mt-6 font-display text-6xl font-bold leading-none text-zinc-950">
              PLAN THE
              <span className="block bg-gradient-to-r from-blue-600 via-violet-600 to-rose-500 bg-clip-text text-transparent">
                WORKDAY
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-zinc-600">
              Track execution, uncover overdue risk, and stay on top of every
              deadline with a clean editorial workspace enriched by focused color accents for serious
              productivity.
            </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-2">
            <div className="panel-muted border-blue-200/60 bg-blue-50/70 p-5">
              <p className="text-sm text-zinc-500">Task Intelligence</p>
              <p className="mt-2 font-display text-4xl font-bold text-zinc-950">24/7</p>
              <p className="mt-2 text-sm text-zinc-500">
                Live status, overdue, and upcoming workload tracking.
              </p>
            </div>
            <div className="panel-muted border-emerald-200/60 bg-emerald-50/70 p-5">
              <p className="text-sm text-zinc-500">Workspace Security</p>
              <p className="mt-2 font-display text-4xl font-bold text-zinc-950">JWT</p>
              <p className="mt-2 text-sm text-zinc-500">
                Protected user sessions with token refresh support.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-8 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-gradient-to-r from-zinc-950 via-blue-700 to-cyan-500 px-4 py-2 text-sm text-white">
                <ShieldCheck className="h-4 w-4" />
                Secure workspace sign in
              </div>
              <h2 className="font-display text-4xl font-bold text-zinc-950">
                Welcome back
              </h2>
              <p className="mt-2 text-zinc-500">
                Sign in to access your dashboard, tasks, and analytics.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="form-label" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your password"
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-black/10 bg-zinc-950 px-4 py-3 text-sm text-white">
                  {error}
                </div>
              ) : null}

              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? "Signing in..." : "Sign In"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="panel-muted mt-5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Demo account
              </p>
              <p className="mt-2 text-sm text-zinc-600">
                After running the local seed command:
                <span className="ml-2 font-semibold text-zinc-950">nehasharma / Demo@12345</span>
              </p>
            </div>

            <p className="mt-6 text-sm text-zinc-500">
              New here?{" "}
              <Link to="/register" className="font-semibold text-blue-700 transition hover:text-blue-600">
                Create your workspace
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
