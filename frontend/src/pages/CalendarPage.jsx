import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { fetchTasks } from "../api/tasks";
import {
  formatDateTime,
  priorityClassMap,
  statusClassMap,
} from "../utils/formatters";

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toDateKey(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(baseDate, days) {
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function buildCalendarDays(currentMonth) {
  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  );
  const weekdayOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const gridStart = addDays(firstDayOfMonth, -weekdayOffset);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const calendarDays = buildCalendarDays(currentMonth);
  const rangeStart = toDateKey(calendarDays[0]);
  const rangeEnd = toDateKey(calendarDays[calendarDays.length - 1]);

  useEffect(() => {
    const loadCalendarTasks = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetchTasks({
          date_from: rangeStart,
          date_to: rangeEnd,
          page_size: 100,
          ordering: "due_date",
        });
        setTasks(response.results || []);
      } catch (loadError) {
        setError("We couldn't load your synced task calendar right now.");
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    loadCalendarTasks();
  }, [rangeEnd, rangeStart]);

  const tasksByDate = tasks.reduce((accumulator, task) => {
    const key = toDateKey(task.due_date);
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(task);
    return accumulator;
  }, {});

  const selectedTasks = tasksByDate[selectedDate] || [];
  const currentMonthIndex = currentMonth.getMonth();
  const currentMonthYear = currentMonth.getFullYear();
  const todayKey = toDateKey(new Date());

  const tasksThisMonth = tasks.filter((task) => {
    const dueDate = new Date(task.due_date);
    return (
      dueDate.getMonth() === currentMonthIndex &&
      dueDate.getFullYear() === currentMonthYear
    );
  });

  const completedThisMonth = tasksThisMonth.filter(
    (task) => task.status === "completed"
  ).length;
  const overdueThisMonth = tasksThisMonth.filter((task) => task.is_overdue).length;
  const activeDays = Object.keys(tasksByDate).filter((key) => {
    const date = parseDateKey(key);
    return (
      date.getMonth() === currentMonthIndex && date.getFullYear() === currentMonthYear
    );
  }).length;

  return (
    <div className="space-y-6">
      <section className="panel bg-dashboard-sheen p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">Synced Task Calendar</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-zinc-950">
              Deadline planning at a glance
            </h2>
            <p className="mt-2 max-w-2xl text-zinc-600">
              Every task due date is reflected here so you can review daily workload,
              spot hot days, and jump straight back into execution.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="metric-chip">Month view</span>
              <span className="metric-chip">Due-date aware</span>
              <span className="metric-chip">Task-linked details</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() =>
                setCurrentMonth(
                  new Date(currentMonthYear, currentMonthIndex - 1, 1)
                )
              }
              className="icon-button"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="panel-muted px-5 py-3 text-center">
              <p className="font-display text-xl font-bold text-zinc-950">
                {currentMonth.toLocaleString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setCurrentMonth(
                  new Date(currentMonthYear, currentMonthIndex + 1, 1)
                )
              }
              className="icon-button"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tasks This Month", value: tasksThisMonth.length },
          { label: "Completed This Month", value: completedThisMonth },
          { label: "Overdue This Month", value: overdueThisMonth },
          { label: "Busy Calendar Days", value: activeDays },
        ].map((item) => (
          <div key={item.label} className="panel-interactive p-5">
            <p className="eyebrow">{item.label}</p>
            <p className="mt-3 font-display text-4xl font-bold text-zinc-950">
              {loading ? "--" : item.value}
            </p>
          </div>
        ))}
      </section>

      {error ? (
        <div className="rounded-2xl border border-black/10 bg-zinc-950 px-4 py-3 text-sm text-white">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr),minmax(320px,420px)]">
        <div className="panel p-6">
          <div className="grid grid-cols-7 gap-3 border-b border-black/10 pb-4">
            {weekdayLabels.map((day) => (
              <div
                key={day}
                className="text-center text-xs uppercase tracking-[0.2em] text-slate-400"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-7 gap-3">
            {calendarDays.map((day) => {
              const dateKey = toDateKey(day);
              const dayTasks = tasksByDate[dateKey] || [];
              const isCurrentMonth = day.getMonth() === currentMonthIndex;
              const isSelected = selectedDate === dateKey;
              const isToday = todayKey === dateKey;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDate(dateKey)}
                  className={`min-h-[110px] rounded-2xl border p-3 text-left transition ${
                    isSelected
                      ? "border-blue-200 bg-blue-50/90 shadow-lg shadow-blue-500/10"
                      : "border-black/10 bg-white hover:-translate-y-0.5 hover:bg-zinc-50"
                  } ${!isCurrentMonth ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-semibold ${
                        isToday ? "text-zinc-950 underline" : "text-zinc-950"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {dayTasks.length ? (
                      <span className="rounded-full bg-black/5 px-2 py-1 text-xs text-zinc-700">
                        {dayTasks.length}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-2">
                    {dayTasks.slice(0, 2).map((task) => (
                      <div
                        key={task.id}
                        className={`truncate rounded-xl px-2 py-1 text-xs font-medium ${
                          task.is_overdue
                            ? "bg-zinc-950 text-white"
                            : task.status === "completed"
                              ? "bg-zinc-200 text-zinc-900"
                              : "bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 ? (
                      <p className="text-xs text-slate-400">
                        +{dayTasks.length - 2} more
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="panel p-6">
          <div className="mb-5 flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-zinc-900" />
            <div>
              <h3 className="section-title">Selected Day</h3>
              <p className="mt-1 text-sm text-slate-400">
                {parseDateKey(selectedDate).toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {selectedTasks.length ? (
            <div className="space-y-3">
              {selectedTasks.map((task) => (
                <div key={task.id} className="panel-interactive p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-950">{task.title}</p>
                      <p className="mt-2 text-sm text-zinc-500">
                        {task.description || "No description added for this task yet."}
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                        <Clock3 className="h-3.5 w-3.5" />
                        <span>{formatDateTime(task.due_date)}</span>
                      </div>
                    </div>

                    <Link
                      to={`/tasks?search=${encodeURIComponent(task.title)}`}
                      className="icon-button h-10 w-10"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
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
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-black/10 bg-white px-6 py-12 text-center">
              <h3 className="font-display text-2xl font-bold text-zinc-950">
                No synced deadlines
              </h3>
              <p className="mt-2 text-sm text-zinc-500">
                No tasks are due on this day yet. Pick another date or add a new task.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
