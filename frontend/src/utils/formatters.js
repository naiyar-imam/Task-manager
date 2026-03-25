export const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const taskTabs = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
];

export const sortOptions = [
  { value: "due_date", label: "Due Date (Earliest)" },
  { value: "-due_date", label: "Due Date (Latest)" },
  { value: "-created_at", label: "Newest First" },
  { value: "created_at", label: "Oldest First" },
  { value: "title", label: "Title (A-Z)" },
  { value: "-title", label: "Title (Z-A)" },
  { value: "-priority", label: "Priority (High-Low)" },
  { value: "priority", label: "Priority (Low-High)" },
  { value: "status", label: "Status (Pending-Completed)" },
];

export const defaultPreferences = {
  dashboardRange: 7,
  defaultTaskTab: "all",
  defaultPageSize: 10,
  compactRows: false,
  emailDigest: true,
  showActivityFeed: true,
};

export const statusClassMap = {
  pending: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  in_progress: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  completed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

export const priorityClassMap = {
  low: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  medium: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  high: "bg-rose-100 text-rose-800 ring-1 ring-rose-200",
};

export function getInitials(name = "") {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "TM";
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function formatDateTime(value) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatShortDate(value) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function formatLongDate(value) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatRelativeDay(value) {
  if (!value) {
    return "--";
  }

  const target = new Date(value);
  const now = new Date();
  const targetDate = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((targetDate - todayDate) / 86400000);

  if (diff === 0) {
    return "Today";
  }
  if (diff === 1) {
    return "Tomorrow";
  }
  if (diff === -1) {
    return "Yesterday";
  }
  if (diff > 1 && diff < 7) {
    return `In ${diff} days`;
  }
  if (diff < -1 && diff > -7) {
    return `${Math.abs(diff)} days ago`;
  }
  return formatShortDate(value);
}

export function toDateTimeLocal(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function toApiDateTime(value) {
  return value ? new Date(value).toISOString() : "";
}

export function formatChartLabel(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}
