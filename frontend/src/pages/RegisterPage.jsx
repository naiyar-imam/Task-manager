import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const initialForm = {
  first_name: "",
  last_name: "",
  username: "",
  email: "",
  password: "",
  confirm_password: "",
};

export default function RegisterPage() {
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
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
      await register(form);
      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      const payload = submitError?.response?.data;
      if (payload && typeof payload === "object") {
        const firstError = Object.values(payload).flat()[0];
        setError(firstError || "Registration failed. Please review your details.");
      } else {
        setError("Registration failed. Please review your details.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-black/10 bg-white/90 shadow-elevation backdrop-blur-xl lg:grid-cols-[0.95fr,1.05fr]">
        <div className="flex items-center justify-center p-8 sm:p-10">
          <div className="w-full max-w-lg">
            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-gradient-to-r from-zinc-950 via-violet-600 to-rose-500 px-4 py-2 text-sm text-white">
                <Sparkles className="h-4 w-4" />
                Build your colorful workspace
              </div>
              <h2 className="font-display text-4xl font-bold text-zinc-950">
                Create your account
              </h2>
              <p className="mt-2 text-zinc-500">
                Start managing tasks, monitoring progress, and unlocking analytics.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="form-label" htmlFor="first_name">
                    First Name
                  </label>
                  <input
                    id="first_name"
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Neha"
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="last_name">
                    Last Name
                  </label>
                  <input
                    id="last_name"
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Sharma"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
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
                    placeholder="nehasharma"
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
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
                    placeholder="Minimum 8 characters"
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="confirm_password">
                    Confirm Password
                  </label>
                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    value={form.confirm_password}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Repeat your password"
                  />
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-black/10 bg-zinc-950 px-4 py-3 text-sm text-white">
                  {error}
                </div>
              ) : null}

              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? "Creating workspace..." : "Create Account"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-6 text-sm text-zinc-500">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-violet-700 transition hover:text-violet-600">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="hidden bg-dashboard-sheen p-10 lg:block">
          <div className="panel h-full p-8">
            <p className="eyebrow">What you get</p>
            <div className="mt-8 grid gap-5">
              {[
                {
                  title: "A refined monochrome workspace",
                  text: "A polished sidebar, rich cards, charts, and responsive task operations with restrained contrast.",
                },
                {
                  title: "Backend-powered metrics",
                  text: "Dashboard counts and analytics come from Django aggregation, not mocked UI math.",
                },
                {
                  title: "Focused execution",
                  text: "Tabs for Today, Upcoming, and Completed keep the task list sharp and actionable.",
                },
              ].map((feature) => (
                <div key={feature.title} className="panel-muted p-5">
                  <h3 className="font-display text-2xl font-bold text-zinc-950">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-zinc-500">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
