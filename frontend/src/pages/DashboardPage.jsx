import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CircleDashed,
  ListTodo,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import { fetchAnalytics, fetchStats, fetchTasks } from "../api/tasks";
import PriorityDoughnutChart from "../components/charts/PriorityDoughnutChart";
import StatusDoughnutChart from "../components/charts/StatusDoughnutChart";
import TaskTrendChart from "../components/charts/TaskTrendChart";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import useLocalStorage from "../hooks/useLocalStorage";
import {
  defaultPreferences,
  formatLongDate,
  formatRelativeDay,
  priorityClassMap,
  statusClassMap,
  taskTabs,
} from "../utils/formatters";

export default function DashboardPage() {
  const { user } = useAuth();
  const [preferences] = useLocalStorage("task-dashboard-preferences", defaultPreferences);
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [previewTab, setPreviewTab] = useState("all");
  const [previewTasks, setPreviewTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const [statsData, analyticsData] = await Promise.all([
          fetchStats(),
          fetchAnalytics({ days: preferences.dashboardRange }),
        ]);
        setSummary(statsData);
        setAnalytics(analyticsData);
      } catch (loadError) {
        setError("We couldn't load your dashboard right now.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [preferences.dashboardRange]);

  useEffect(() => {
    const loadPreviewTasks = async () => {
      setLoadingPreview(true);

      try {
        const response = await fetchTasks({
          tab: previewTab,
          page_size: 5,
          ordering: "due_date",
        });
        setPreviewTasks(response.results || []);
      } catch (loadError) {
        setPreviewTasks([]);
      } finally {
        setLoadingPreview(false);
      }
    };

    loadPreviewTasks();
  }, [previewTab]);

  const firstName =
    user?.first_name || user?.full_name?.split(" ")?.[0] || user?.username || "there";
  const completionRate = summary?.total
    ? Math.round((summary.completed / summary.total) * 100)
    : 0;
  const overdueRate = summary?.total
    ? Math.round((summary.overdue / summary.total) * 100)
    : 0;
  const activeRate = summary?.total
    ? Math.round((summary.in_progress / summary.total) * 100)
    : 0;
  const hasTasks = (summary?.total ?? 0) > 0;

  return (
    <div className="space-y-6">
      <section className="panel bg-dashboard-sheen px-6 py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">Daily command center</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-zinc-950">
              Welcome Back, {firstName}!
            </h2>
            <p className="mt-2 max-w-2xl text-zinc-600">
              Here's what's happening today across your tasks, deadlines, and
              productivity signals.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="metric-chip border-emerald-200 bg-emerald-50 text-emerald-700">
                Completion {completionRate}%
              </span>
              <span className="metric-chip border-rose-200 bg-rose-50 text-rose-700">
                Overdue {summary?.overdue ?? 0}
              </span>
              <span className="metric-chip border-amber-200 bg-amber-50 text-amber-700">
                Today {summary?.today ?? 0}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="panel-muted px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-700/70">
                Active Range
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-950">
                Last {preferences.dashboardRange} days
              </p>
            </div>
            <div className="panel-muted flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-violet-700/70">
                  Performance Pulse
                </p>
                <p className="mt-1 text-lg font-semibold text-zinc-950">
                  {activeRate}% active load
                </p>
              </div>
              <Link to="/tasks" className="btn-primary">
                <Plus className="h-4 w-4" />
                Manage Tasks
              </Link>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-black/10 bg-zinc-950 px-4 py-3 text-sm text-white">
          {error}
        </div>
      ) : null}

      {!loading && !hasTasks ? (
        <section className="panel-strong p-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Workspace Ready</p>
            <h3 className="mt-3 font-display text-3xl font-bold text-white">
              This account does not have any tasks yet
            </h3>
            <p className="mt-3 text-zinc-300">
              Tasks are isolated per user. Your login worked, but this account is still empty, so the dashboard has no task data to visualize yet.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link to="/tasks" className="btn-primary">
                <Plus className="h-4 w-4" />
                Create Your First Task
              </Link>
              <Link to="/login" className="btn-secondary">
                Use Demo Login Instead
              </Link>
            </div>
            <div className="panel-muted mt-6 px-5 py-4 text-left text-sm text-zinc-300">
              <p className="font-semibold text-white">Portfolio demo account</p>
              <p className="mt-2">Username: <span className="font-medium text-white">nehasharma</span></p>
              <p className="mt-1">Password: <span className="font-medium text-white">Demo@12345</span></p>
            </div>
          </div>
        </section>
      ) : null}

      {(loading || hasTasks) && (
        <>
          <section className="grid gap-5 xl:grid-cols-4">
            <StatCard
              title="Total Tasks"
              value={loading ? "--" : summary?.total ?? 0}
              subtitle={`${summary?.overdue ?? 0} overdue right now`}
              icon={ListTodo}
              variant="blue"
            />
            <StatCard
              title="Tasks Completed"
              value={loading ? "--" : summary?.completed ?? 0}
              subtitle={`${completionRate}% completion rate`}
              icon={CheckCircle2}
              variant="green"
            />
            <StatCard
              title="In Progress"
              value={loading ? "--" : summary?.in_progress ?? 0}
              subtitle={`${activeRate}% of total workload`}
              icon={Clock3}
              variant="amber"
            />
            <StatCard
              title="Pending Tasks"
              value={loading ? "--" : summary?.pending ?? 0}
              subtitle={`${summary?.today ?? 0} due today`}
              icon={CircleDashed}
              variant="rose"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr),360px]">
            <div className="panel p-6">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="section-title">Task Overview</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Created, completed, due, and overdue workload across your selected range.
                  </p>
                </div>
                <div className="metric-chip">
                  Last {preferences.dashboardRange} Days
                </div>
              </div>
              <div className="h-[360px]">
                <TaskTrendChart trend={analytics?.trend || []} />
              </div>
            </div>

            <div className="space-y-6">
              <div className="panel p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="section-title">Upcoming Deadlines</h3>
                  <span className="text-sm text-slate-400">
                    {(analytics?.upcoming_deadlines || []).length} items
                  </span>
                </div>
                <div className="space-y-3">
                  {(analytics?.upcoming_deadlines || []).map((task) => (
                    <div key={task.id} className="panel-interactive p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-zinc-950">{task.title}</p>
                          <p className="mt-1 text-sm text-zinc-500">
                            {formatRelativeDay(task.due_date)} - {formatLongDate(task.due_date)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            priorityClassMap[task.priority]
                          }`}
                        >
                          {task.priority_display}
                        </span>
                      </div>
                    </div>
                  ))}

                  {!analytics?.upcoming_deadlines?.length ? (
                    <div className="panel-muted px-4 py-6 text-center text-sm text-slate-400">
                      No upcoming deadlines yet.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="panel p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="section-title">Execution Health</h3>
                  <AlertTriangle className="h-5 w-5 text-zinc-900" />
                </div>
                <div className="space-y-5">
                  {[
                    {
                      label: "Completion Rate",
                      value: completionRate,
                      color: "from-emerald-500 to-emerald-700",
                    },
                    {
                      label: "In Progress Load",
                      value: activeRate,
                      color: "from-blue-500 to-cyan-500",
                    },
                    {
                      label: "Overdue Risk",
                      value: overdueRate,
                      color: "from-rose-400 to-orange-300",
                    },
                  ].map((metric) => (
                    <div key={metric.label}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-zinc-600">{metric.label}</span>
                        <span className="font-semibold text-zinc-950">{metric.value}%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-black/10">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${metric.color}`}
                          style={{ width: `${metric.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr),minmax(320px,420px)]">
            <div className="panel p-6">
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="section-title">My Tasks</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Fast access to your filtered task list with clean tab behavior.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {taskTabs.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setPreviewTab(tab.value)}
                      className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                        previewTab === tab.value
                          ? "bg-gradient-to-r from-zinc-950 via-blue-700 to-cyan-500 text-white shadow-lg shadow-blue-500/15"
                          : "border border-black/10 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {loadingPreview ? (
                  [...Array(4)].map((_, index) => (
                    <div key={index} className="panel-muted h-20 animate-pulse" />
                  ))
                ) : previewTasks.length ? (
                  previewTasks.map((task) => (
                    <div
                      key={task.id}
                      className="panel-interactive flex flex-col gap-3 border-l-4 border-l-zinc-950 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-zinc-950">{task.title}</p>
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              statusClassMap[task.status]
                            }`}
                          >
                            {task.status_display}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-500">
                          {task.description || "No description added for this task yet."}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-zinc-800">
                          {formatLongDate(task.due_date)}
                        </p>
                        <span
                          className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            priorityClassMap[task.priority]
                          }`}
                        >
                          {task.priority_display}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="panel-muted px-4 py-8 text-center text-sm text-slate-400">
                    No tasks matched this tab yet.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="panel p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="section-title">Status Distribution</h3>
                  <span className="text-sm text-slate-400">Live mix</span>
                </div>
                <StatusDoughnutChart distribution={analytics?.status_distribution || {}} />
              </div>

              <div className="panel p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="section-title">Priority Allocation</h3>
                  <span className="text-sm text-slate-400">Work intensity</span>
                </div>
                <PriorityDoughnutChart
                  distribution={analytics?.priority_distribution || {}}
                />
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
