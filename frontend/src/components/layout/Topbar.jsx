import { Bell, CalendarRange, Search, Settings2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { getInitials } from "../../utils/formatters";

export default function Topbar({ title }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const displayName = user?.full_name || user?.username || "Workspace";
  const todayLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  useEffect(() => {
    if (location.pathname !== "/tasks") {
      return;
    }

    const params = new URLSearchParams(location.search);
    setQuery(params.get("search") || "");
  }, [location.pathname, location.search]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      navigate("/tasks");
      return;
    }

    navigate(`/tasks?search=${encodeURIComponent(trimmedQuery)}`);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-[#faf8f3]/90 backdrop-blur-2xl">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="metric-chip">
                <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                AI productivity workspace
              </span>
              <span className="metric-chip">
                <CalendarRange className="h-3.5 w-3.5 text-amber-600" />
                {todayLabel}
              </span>
            </div>
            <div>
              <p className="eyebrow">AI-Powered Task Management Dashboard</p>
              <h1 className="font-display text-3xl font-bold text-zinc-950">{title}</h1>
              <p className="mt-1 text-sm text-zinc-600">
                Keep tasks, insights, and deadlines moving from one clean editorial command bar.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            <button type="button" className="icon-button relative">
              <Bell className="h-5 w-5" />
              <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]" />
            </button>

            <Link to="/settings" className="icon-button">
              <Settings2 className="h-5 w-5" />
            </Link>

            <div className="panel-muted flex items-center gap-3 px-3 py-2.5">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-950 via-blue-700 to-cyan-500 font-display text-sm font-bold text-white">
                {getInitials(displayName)}
                <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-zinc-950">{displayName}</p>
                <p className="text-xs text-zinc-500">Focused and in control</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <form
            onSubmit={handleSubmit}
            className="panel-muted flex w-full items-center gap-3 px-4 py-3 text-sm text-zinc-500 xl:max-w-[620px]"
          >
            <div className="metric-orb h-10 w-10 rounded-2xl">
              <Search className="h-4 w-4 text-zinc-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-500">
                Smart Search
              </p>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full bg-transparent pt-0.5 text-zinc-950 outline-none placeholder:text-zinc-400"
                placeholder="Search tasks, deadlines, or analytics"
              />
            </div>
            <button type="submit" className="btn-primary px-3.5 py-2">
              Go
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            <span className="metric-chip">Live analytics</span>
            <span className="metric-chip">Task sync active</span>
            <span className="metric-chip">Calendar aware</span>
          </div>
        </div>
      </div>
    </header>
  );
}
