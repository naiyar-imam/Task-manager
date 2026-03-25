import {
  BarChart3,
  Bell,
  Calendar,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  SquareKanban,
} from "lucide-react";
import { Link, NavLink } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { getInitials } from "../../utils/formatters";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "My Tasks", path: "/tasks", icon: SquareKanban },
  { label: "Calendar", path: "/calendar", icon: Calendar },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
  { label: "Settings", path: "/settings", icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const fullName = user?.full_name || user?.username || "Workspace Owner";

  return (
    <aside className="relative border-r border-black/10 bg-white/70 px-4 py-5 backdrop-blur-2xl lg:w-[320px] lg:px-6">
      <div className="mb-6 flex items-center justify-between px-1">
        <div>
          <p className="eyebrow">Productivity OS</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-zinc-950">
            TaskPilot AI
          </h2>
        </div>
        <div className="metric-orb h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50">
          <Sparkles className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      <div className="panel mb-6 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-950 via-blue-700 to-cyan-500 font-display text-xl font-bold text-white">
            {getInitials(fullName)}
          </div>
          <div>
            <p className="font-display text-xl font-bold text-zinc-950">{fullName}</p>
            <p className="text-sm text-zinc-600">
              {user?.email || "AI productivity operator"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="metric-chip border-emerald-200 bg-emerald-50 text-emerald-700">
                Live sync
              </span>
              <span className="metric-chip">Personal workspace</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="panel p-3">
        <div className="px-3 pb-3">
          <p className="eyebrow">Navigate</p>
        </div>
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition duration-300",
                    isActive
                      ? "bg-gradient-to-r from-zinc-950 via-blue-700 to-cyan-500 text-white shadow-lg shadow-blue-500/15"
                      : "text-zinc-700 hover:bg-black/[0.04] hover:text-zinc-950",
                  ].join(" ")
                }
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1">{item.label}</span>
                <span className="h-2 w-2 rounded-full bg-current opacity-30" />
              </NavLink>
            );
          })}
        </div>

        <div className="soft-divider my-5" />

        <div className="space-y-3 px-2 pb-2">
          <div className="panel-interactive flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-zinc-700">Notifications</span>
            </div>
            <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
              Live
            </span>
          </div>

          <Link
            to="/calendar"
            className="panel-interactive flex items-center gap-3 px-4 py-3"
          >
            <Calendar className="h-4 w-4 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-zinc-950">Focus Calendar</p>
              <p className="text-xs text-zinc-500">
                Deadlines sync with your task calendar
              </p>
            </div>
          </Link>

          <div className="panel-muted px-4 py-4">
            <p className="eyebrow">Momentum Tip</p>
            <p className="mt-3 text-sm text-zinc-600">
              Keep your dashboard healthiest when overdue stays below 10% of total active work.
            </p>
          </div>
        </div>
      </nav>

      <button
        type="button"
        onClick={logout}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-zinc-900 shadow-inner-glow transition duration-300 hover:-translate-y-0.5 hover:bg-zinc-50"
      >
        <LogOut className="h-4 w-4" />
        Log Out
      </button>
    </aside>
  );
}
