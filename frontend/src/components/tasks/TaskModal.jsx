import { useEffect, useState } from "react";
import { CalendarDays, FileText, Flag, X } from "lucide-react";

import {
  priorityOptions,
  statusOptions,
  toApiDateTime,
  toDateTimeLocal,
} from "../../utils/formatters";

const emptyForm = {
  title: "",
  description: "",
  status: "pending",
  priority: "medium",
  due_date: "",
};

export default function TaskModal({
  isOpen,
  initialTask,
  onClose,
  onSubmit,
  saving,
}) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialTask) {
      setForm({
        title: initialTask.title || "",
        description: initialTask.description || "",
        status: initialTask.status || "pending",
        priority: initialTask.priority || "medium",
        due_date: toDateTimeLocal(initialTask.due_date),
      });
    } else {
      setForm(emptyForm);
    }
  }, [initialTask, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Task title is required.");
      return;
    }

    if (!form.due_date) {
      setError("Please select a due date.");
      return;
    }

    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        priority: form.priority,
        due_date: toApiDateTime(form.due_date),
      });
      onClose();
    } catch (submitError) {
      setError(
        submitError?.response?.data?.detail ||
          "We could not save this task. Please review the form and try again."
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-md">
      <div className="panel w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
          <div>
            <p className="eyebrow">Task Workspace</p>
            <h2 className="font-display text-2xl font-bold text-zinc-950">
              {initialTask ? "Edit Task" : "Create New Task"}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Strong task details power your dashboard, calendar view, and sync automations.
            </p>
          </div>
          <button type="button" className="icon-button h-10 w-10" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="panel-muted grid gap-4 px-4 py-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Clarity</p>
              <p className="mt-2 text-sm text-zinc-600">
                Give the task a clean title and enough context for fast execution.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Priority</p>
              <p className="mt-2 text-sm text-zinc-600">
                High-priority tasks will stand out across the table and analytics views.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Deadline</p>
              <p className="mt-2 text-sm text-zinc-600">
                Due dates feed calendar sync, overdue tracking, and trend reporting.
              </p>
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="title">
              Title
            </label>
            <div className="relative">
              <FileText className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-zinc-400" />
              <input
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                className="form-input pl-11"
                placeholder="Design landing page, prepare client report..."
              />
            </div>
          </div>

          <div className="panel-muted p-4">
            <label className="form-label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="4"
              className="form-input min-h-[120px] resize-none"
              placeholder="Add context, expectations, and important notes for this task."
            />
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="form-label" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className="form-input"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" htmlFor="priority">
                Priority
              </label>
              <div className="relative">
                <Flag className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-zinc-400" />
                <select
                  id="priority"
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  className="form-input pl-11"
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="due_date">
                Due Date
              </label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-zinc-400" />
                <input
                  id="due_date"
                  name="due_date"
                  type="datetime-local"
                  value={form.due_date}
                  onChange={handleChange}
                  className="form-input pl-11"
                />
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-black/10 bg-zinc-950 px-4 py-3 text-sm text-white">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-black/10 pt-5 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : initialTask ? "Update Task" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
