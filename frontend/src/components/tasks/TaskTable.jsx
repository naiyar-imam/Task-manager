import { Edit3, Trash2 } from "lucide-react";

import {
  formatDateTime,
  priorityClassMap,
  statusClassMap,
} from "../../utils/formatters";

export default function TaskTable({
  tasks,
  loading,
  compactRows,
  page,
  totalPages,
  onPageChange,
  onEdit,
  onDelete,
}) {
  const rowAccentMap = {
    high: "border-l-zinc-950",
    medium: "border-l-zinc-500",
    low: "border-l-zinc-300",
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="panel-muted h-20 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!tasks.length) {
    return (
      <div className="rounded-3xl border border-dashed border-black/10 bg-white px-6 py-12 text-center">
        <h3 className="font-display text-2xl font-bold text-zinc-950">No tasks found</h3>
        <p className="mt-2 text-sm text-zinc-500">
          Try adjusting your filters or add a fresh task to start building momentum.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-3">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-400">
              <th className="px-4 py-2">Task</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Priority</th>
              <th className="px-4 py-2">Due Date</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                className={`panel-muted border-l-4 transition duration-300 hover:-translate-y-0.5 hover:border-black/15 hover:bg-black/[0.04] ${rowAccentMap[task.priority] || "border-l-black/10"}`}
              >
                <td className={`px-4 ${compactRows ? "py-3" : "py-5"}`}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-zinc-950">{task.title}</p>
                      {task.is_overdue ? (
                        <span className="rounded-full border border-black/10 bg-zinc-950 px-2.5 py-1 text-[11px] font-semibold text-white">
                          Needs recovery
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 max-w-xl text-sm text-zinc-500">
                      {task.description || "No description added yet."}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      statusClassMap[task.status]
                    }`}
                  >
                    {task.status_display}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      priorityClassMap[task.priority]
                    }`}
                  >
                    {task.priority_display}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div>
                    <p className="text-sm font-semibold text-zinc-800">
                      {formatDateTime(task.due_date)}
                    </p>
                    {task.is_overdue ? (
                      <p className="mt-1 text-xs font-medium text-zinc-500">
                        Overdue and needs attention
                      </p>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(task)}
                      className="icon-button h-10 w-10"
                      aria-label={`Edit ${task.title}`}
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(task)}
                      className="icon-button h-10 w-10"
                      aria-label={`Delete ${task.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-black/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="metric-chip w-fit">
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
