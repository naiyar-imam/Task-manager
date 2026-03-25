import { AlertTriangle, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import { fetchAnalytics } from "../api/tasks";
import PriorityDoughnutChart from "../components/charts/PriorityDoughnutChart";
import StatusDoughnutChart from "../components/charts/StatusDoughnutChart";
import TaskTrendChart from "../components/charts/TaskTrendChart";
import { formatLongDate, priorityClassMap, statusClassMap } from "../utils/formatters";

const rangeOptions = [7, 14, 30, 90];

export default function AnalyticsPage() {
  const [range, setRange] = useState(30);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetchAnalytics({ days: range });
        setAnalytics(response);
      } catch (loadError) {
        setError("We couldn't load analytics right now.");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [range]);

  return (
    <div className="space-y-6">
      <section className="panel bg-dashboard-sheen p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">Productivity Analytics</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-zinc-950">
              Track momentum over time
            </h2>
            <p className="mt-2 max-w-2xl text-zinc-600">
              Measure workload flow, overdue pressure, and how your priorities are distributed.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="metric-chip">Trend visibility</span>
              <span className="metric-chip">Overdue tracking</span>
              <span className="metric-chip">Priority balance</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {rangeOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRange(option)}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  range === option
                    ? "bg-gradient-to-r from-zinc-950 via-violet-600 to-rose-500 text-white shadow-lg shadow-violet-500/15"
                    : "border border-black/10 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {option} days
              </button>
            ))}
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-black/10 bg-zinc-950 px-4 py-3 text-sm text-white">
          {error}
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Tasks",
            value: analytics?.summary?.total ?? 0,
            helper: "Full tracked workload",
          },
          {
            label: "Completed",
            value: analytics?.summary?.completed ?? 0,
            helper: "Closed with confidence",
          },
          {
            label: "Upcoming",
            value: analytics?.summary?.upcoming ?? 0,
            helper: "Still ahead of you",
          },
          {
            label: "Overdue",
            value: analytics?.summary?.overdue ?? 0,
            helper: "Requires immediate action",
          },
        ].map((item) => (
          <div key={item.label} className="panel-interactive p-5">
            <p className="eyebrow">{item.label}</p>
            <p className="mt-3 font-display text-4xl font-bold text-zinc-950">
              {loading ? "--" : item.value}
            </p>
            <p className="mt-2 text-sm text-zinc-500">{item.helper}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr),minmax(340px,420px)]">
        <div className="panel p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="section-title">Productivity Trend</h3>
              <p className="mt-1 text-sm text-slate-400">
                Created, completed, due, and overdue movement across the selected period.
              </p>
            </div>
              <TrendingUp className="h-5 w-5 text-zinc-900" />
          </div>
          <div className="h-[380px]">
            <TaskTrendChart trend={analytics?.trend || []} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-6">
            <h3 className="section-title">Status Split</h3>
            <p className="mt-1 text-sm text-slate-400">
              Understand how execution is distributed right now.
            </p>
            <div className="mt-4">
              <StatusDoughnutChart distribution={analytics?.status_distribution || {}} />
            </div>
          </div>

          <div className="panel p-6">
            <h3 className="section-title">Priority Load</h3>
            <p className="mt-1 text-sm text-slate-400">
              Spot whether your backlog is leaning toward urgent work.
            </p>
            <div className="mt-6">
              <PriorityDoughnutChart
                distribution={analytics?.priority_distribution || {}}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="panel p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="section-title">Overdue Tracking</h3>
              <p className="mt-1 text-sm text-slate-400">
                Prioritize tasks that are already behind schedule.
              </p>
            </div>
              <AlertTriangle className="h-5 w-5 text-zinc-900" />
          </div>
          <div className="space-y-3">
            {(analytics?.overdue_tasks || []).map((task) => (
              <div key={task.id} className="panel-interactive p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-zinc-950">{task.title}</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {formatLongDate(task.due_date)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        statusClassMap[task.status]
                      }`}
                    >
                      {task.status_display}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        priorityClassMap[task.priority]
                      }`}
                    >
                      {task.priority_display}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {!analytics?.overdue_tasks?.length ? (
              <div className="panel-muted px-4 py-8 text-center text-sm text-slate-400">
                No overdue tasks. You're staying ahead.
              </div>
            ) : null}
          </div>
        </div>

        <div className="panel p-6">
          <div className="mb-5">
            <h3 className="section-title">Recent Activity</h3>
            <p className="mt-1 text-sm text-slate-400">
              The latest task events pulled from your workspace.
            </p>
          </div>
          <div className="space-y-3">
            {(analytics?.recent_activity || []).map((entry) => (
              <div
                key={`${entry.id}-${entry.timestamp}`}
                className="panel-interactive p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zinc-950">
                      {entry.action} - {entry.title}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {formatLongDate(entry.timestamp)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        statusClassMap[entry.status]
                      }`}
                    >
                      {entry.status.replace("_", " ")}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        priorityClassMap[entry.priority]
                      }`}
                    >
                      {entry.priority}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {!analytics?.recent_activity?.length ? (
              <div className="panel-muted px-4 py-8 text-center text-sm text-slate-400">
                Recent activity will appear once you start managing tasks.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
