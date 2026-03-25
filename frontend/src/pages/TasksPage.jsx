import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
} from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  createTask,
  deleteTask,
  fetchStats,
  fetchTasks,
  updateTask,
} from "../api/tasks";
import TaskModal from "../components/tasks/TaskModal";
import TaskTable from "../components/tasks/TaskTable";
import StatCard from "../components/StatCard";
import useLocalStorage from "../hooks/useLocalStorage";
import {
  defaultPreferences,
  priorityOptions,
  sortOptions,
  statusOptions,
  taskTabs,
} from "../utils/formatters";

export default function TasksPage() {
  const [preferences] = useLocalStorage("task-dashboard-preferences", defaultPreferences);
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = taskTabs.some((tabOption) => tabOption.value === requestedTab)
    ? requestedTab
    : preferences.defaultTaskTab;
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(preferences.defaultPageSize);
  const [tab, setTab] = useState(initialTab);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [ordering, setOrdering] = useState("due_date");
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const deferredSearch = useDeferredValue(searchInput);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [saving, setSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const loadTasks = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchTasks({
        page,
        page_size: pageSize,
        tab,
        ordering,
        search: deferredSearch || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      });

      setTasks(response.results || []);
      setCount(response.count || 0);
    } catch (loadError) {
      setError("We couldn't load tasks right now.");
      setTasks([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetchStats();
      setStats(response);
    } catch (loadError) {
      setStats(null);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    const nextSearch = searchParams.get("search") || "";
    const nextTab = searchParams.get("tab");

    if (nextSearch !== searchInput) {
      setSearchInput(nextSearch);
    }

    if (
      nextTab &&
      taskTabs.some((tabOption) => tabOption.value === nextTab) &&
      nextTab !== tab
    ) {
      setTab(nextTab);
    }
  }, [searchParams, searchInput, tab]);

  useEffect(() => {
    loadTasks();
  }, [page, pageSize, tab, ordering, deferredSearch, statusFilter, priorityFilter]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, tab, ordering, deferredSearch, statusFilter, priorityFilter]);

  const openCreateModal = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleSaveTask = async (payload) => {
    setSaving(true);

    try {
      if (editingTask) {
        await updateTask(editingTask.id, payload);
      } else {
        await createTask(payload);
      }

      await Promise.all([loadTasks(), loadStats()]);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (task) => {
    const shouldDelete = window.confirm(
      `Delete "${task.title}"? This action cannot be undone.`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await deleteTask(task.id);
      if (tasks.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadTasks();
      }
      await loadStats();
    } catch (deleteError) {
      setError("We couldn't delete that task.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel bg-dashboard-sheen p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="eyebrow">Task Management</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-zinc-950">
              Execute with clarity
            </h2>
            <p className="mt-2 max-w-2xl text-zinc-600">
              Search, sort, filter, paginate, and manage your task pipeline from one place.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="metric-chip border-blue-200 bg-blue-50 text-blue-700">Search-ready</span>
              <span className="metric-chip border-violet-200 bg-violet-50 text-violet-700">Smart filters</span>
              <span className="metric-chip border-amber-200 bg-amber-50 text-amber-700">Pagination built in</span>
            </div>
          </div>
          <button type="button" onClick={openCreateModal} className="btn-primary">
            <Sparkles className="h-4 w-4" />
            Add New Task
          </button>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Tasks"
          value={stats?.total ?? 0}
          subtitle="All tracked work in your pipeline"
          icon={Target}
          variant="blue"
        />
        <StatCard
          title="Completed"
          value={stats?.completed ?? 0}
          subtitle="Closed out cleanly"
          icon={CheckCircle2}
          variant="green"
        />
        <StatCard
          title="In Progress"
          value={stats?.in_progress ?? 0}
          subtitle="Current active execution"
          icon={Clock3}
          variant="amber"
        />
        <StatCard
          title="Overdue"
          value={stats?.overdue ?? 0}
          subtitle="Needs immediate attention"
          icon={AlertTriangle}
          variant="rose"
        />
      </section>

      <section className="panel p-6">
        <div className="mb-5 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {taskTabs.map((tabOption) => (
              <button
                key={tabOption.value}
                type="button"
                onClick={() => setTab(tabOption.value)}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  tab === tabOption.value
                    ? "bg-gradient-to-r from-zinc-950 via-blue-700 to-cyan-500 text-white shadow-lg shadow-blue-500/15"
                    : "border border-black/10 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {tabOption.label}
              </button>
            ))}
          </div>

          <div className="panel-muted grid gap-4 p-4 xl:grid-cols-[1.6fr,repeat(4,minmax(0,1fr))]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="form-input pl-11"
                placeholder="Search by title or description"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="form-input"
            >
              <option value="">All Statuses</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="form-input"
            >
              <option value="">All Priorities</option>
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={ordering}
              onChange={(event) => setOrdering(event.target.value)}
              className="form-input"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="relative">
              <SlidersHorizontal className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="form-input pl-11"
              >
                {[5, 10, 20, 30].map((value) => (
                  <option key={value} value={value}>
                    {value} per page
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="metric-chip">{count} task records</span>
            <span className="metric-chip">Tab: {taskTabs.find((item) => item.value === tab)?.label}</span>
            {deferredSearch ? <span className="metric-chip">Search: {deferredSearch}</span> : null}
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-black/10 bg-zinc-950 px-4 py-3 text-sm text-white">
            {error}
          </div>
        ) : null}

        <TaskTable
          tasks={tasks}
          loading={loading}
          compactRows={preferences.compactRows}
          page={page}
          totalPages={totalPages}
          onPageChange={(nextPage) => setPage(Math.min(Math.max(nextPage, 1), totalPages))}
          onEdit={openEditModal}
          onDelete={handleDeleteTask}
        />
      </section>

      <TaskModal
        isOpen={modalOpen}
        initialTask={editingTask}
        onClose={handleModalClose}
        onSubmit={handleSaveTask}
        saving={saving}
      />
    </div>
  );
}
