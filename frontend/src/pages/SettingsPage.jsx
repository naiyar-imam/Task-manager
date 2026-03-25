import {
  CalendarDays,
  ExternalLink,
  Link2,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Unplug,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { API_BASE_URL } from "../api/client";
import {
  beginGoogleCalendarAuthorization,
  disconnectGoogleCalendar,
  fetchGoogleCalendarStatus,
  syncGoogleCalendarTasks,
} from "../api/integrations";
import { useAuth } from "../context/AuthContext";
import useLocalStorage from "../hooks/useLocalStorage";
import {
  defaultPreferences,
  formatDateTime,
  taskTabs,
} from "../utils/formatters";

export default function SettingsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [preferences, setPreferences] = useLocalStorage(
    "task-dashboard-preferences",
    defaultPreferences
  );
  const [saved, setSaved] = useState(false);
  const [googleStatus, setGoogleStatus] = useState({
    configured: false,
    missing_settings: [],
    connected: false,
    calendar_id: "",
    calendar_summary: "",
    calendar_timezone: "",
    last_synced_at: null,
    connected_at: null,
    updated_at: null,
  });
  const [googleLoading, setGoogleLoading] = useState(true);
  const [googleAction, setGoogleAction] = useState("");
  const [googleMessage, setGoogleMessage] = useState("");
  const [googleError, setGoogleError] = useState("");

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    const numericFields = new Set(["dashboardRange", "defaultPageSize"]);
    setPreferences((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? checked
          : numericFields.has(name)
            ? Number(value)
            : value,
    }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setPreferences(defaultPreferences);
    setSaved(false);
  };

  const loadGoogleStatus = async () => {
    setGoogleLoading(true);
    try {
      const response = await fetchGoogleCalendarStatus();
      setGoogleStatus(response);
      setGoogleError("");
    } catch (error) {
      setGoogleError("We couldn't load Google Calendar status right now.");
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    loadGoogleStatus();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const state = params.get("google_calendar");
    const synced = params.get("synced");
    const imported = params.get("imported");
    const exported = params.get("exported");
    const reason = params.get("reason");

    if (state === "connected") {
      setGoogleMessage(
        synced
          ? `Google Calendar connected. Imported ${imported || 0} change(s) from Google and exported ${exported || 0} task event(s).`
          : "Google Calendar connected successfully."
      );
      loadGoogleStatus();
    } else if (state === "error") {
      setGoogleError(
        reason
          ? `Google Calendar connection failed: ${reason}`
          : "Google Calendar connection failed."
      );
    } else if (state === "not_configured") {
      setGoogleError(
        "Google Calendar is not configured on the backend yet. Add the Google OAuth environment variables first."
      );
    }
  }, [location.search]);

  const handleGoogleConnect = async () => {
    setGoogleAction("connect");
    setGoogleError("");

    if (!googleStatus.configured) {
      const missing = googleStatus.missing_settings?.length
        ? googleStatus.missing_settings.join(", ")
        : "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALENDAR_REDIRECT_URI";
      setGoogleError(
        `Google Calendar is not configured yet. Add these values in backend/.env: ${missing}`
      );
      setGoogleAction("");
      return;
    }

    try {
      const response = await beginGoogleCalendarAuthorization();
      window.location.href = response.authorization_url;
    } catch (error) {
      setGoogleError(
        error?.response?.data?.detail ||
          "We couldn't start the Google Calendar connection flow."
      );
      setGoogleAction("");
    }
  };

  const handleGoogleSync = async () => {
    setGoogleAction("sync");
    setGoogleError("");

    try {
      const result = await syncGoogleCalendarTasks();
      setGoogleMessage(
        `Two-way sync complete: ${result.imported_created} imported, ${result.imported_updated} updated from Google, ${result.imported_deleted} removed locally, ${result.exported_created} created in Google, ${result.exported_updated} updated in Google, ${result.failed} failed.`
      );
      await loadGoogleStatus();
    } catch (error) {
      setGoogleError(
        error?.response?.data?.detail || "Google Calendar sync did not complete."
      );
    } finally {
      setGoogleAction("");
    }
  };

  const handleGoogleDisconnect = async () => {
    const confirmed = window.confirm(
      "Disconnect Google Calendar? This removes the local sync connection for your account."
    );

    if (!confirmed) {
      return;
    }

    setGoogleAction("disconnect");
    setGoogleError("");

    try {
      await disconnectGoogleCalendar();
      setGoogleStatus((current) => ({
        ...current,
        connected: false,
        calendar_id: "",
        calendar_summary: "",
        calendar_timezone: "",
        last_synced_at: null,
        connected_at: null,
        updated_at: null,
      }));
      setGoogleMessage("Google Calendar disconnected from this workspace.");
    } catch (error) {
      setGoogleError("We couldn't disconnect Google Calendar right now.");
    } finally {
      setGoogleAction("");
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel bg-dashboard-sheen p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">Workspace Settings</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-zinc-950">
              Tune your command center
            </h2>
            <p className="mt-2 max-w-2xl text-zinc-600">
              Control dashboard defaults, task list behavior, and local productivity preferences.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="metric-chip">Google Calendar ready</span>
              <span className="metric-chip">Local preferences</span>
              <span className="metric-chip">Workspace profile</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={handleReset} className="btn-secondary">
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button type="button" onClick={handleSave} className="btn-primary">
              <Save className="h-4 w-4" />
              Save Preferences
            </button>
          </div>
        </div>
      </section>

      {saved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Preferences saved locally for this workspace.
        </div>
      ) : null}

      {googleMessage ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 shadow-inner-glow">
          {googleMessage}
        </div>
      ) : null}

      {googleError ? (
        <div className="rounded-2xl border border-black/10 bg-zinc-950 px-4 py-3 text-sm text-white">
          {googleError}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(320px,420px),minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="panel p-6">
            <div className="mb-4 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-zinc-900" />
              <h3 className="section-title">Account Overview</h3>
            </div>
            <div className="space-y-4 text-sm">
              <div className="panel-interactive p-4">
                <p className="text-slate-400">Full Name</p>
                <p className="mt-2 text-lg font-semibold text-zinc-950">
                  {user?.full_name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Not set"}
                </p>
              </div>
              <div className="panel-interactive p-4">
                <p className="text-slate-400">Username</p>
                <p className="mt-2 text-lg font-semibold text-zinc-950">{user?.username}</p>
              </div>
              <div className="panel-interactive p-4">
                <p className="text-slate-400">Email</p>
                <p className="mt-2 text-lg font-semibold text-zinc-950">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="panel p-6">
            <div className="mb-4 flex items-center gap-3">
              <SlidersHorizontal className="h-5 w-5 text-zinc-900" />
              <h3 className="section-title">Environment</h3>
            </div>
            <div className="space-y-4 text-sm">
              <div className="panel-interactive p-4">
                <p className="text-slate-400">API Base URL</p>
                <p className="mt-2 break-all font-medium text-zinc-950">{API_BASE_URL}</p>
              </div>
              <div className="panel-interactive p-4">
                <p className="text-slate-400">Authentication</p>
                <p className="mt-2 font-medium text-zinc-950">
                  JWT access tokens with automatic refresh handling
                </p>
              </div>
            </div>
          </div>

          <div className="panel-strong p-6">
            <div className="mb-4 flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-white" />
              <h3 className="section-title">Google Calendar</h3>
            </div>

            {googleLoading ? (
              <div className="panel-muted p-4 text-sm text-slate-400">
                Loading Google Calendar status...
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="panel-interactive p-4">
                  <p className="text-slate-400">Integration Status</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {!googleStatus.configured
                      ? "Not configured"
                      : googleStatus.connected
                        ? "Connected"
                        : "Ready to connect"}
                  </p>
                  <p className="mt-2 text-slate-400">
                    {!googleStatus.configured
                      ? "Add the Google OAuth values in backend/.env first."
                      : googleStatus.connected
                        ? "Your task due dates can now sync into Google Calendar."
                        : "Connect your Google account to sync task deadlines into your calendar."}
                  </p>
                </div>

                {googleStatus.connected ? (
                  <>
                    <div className="panel-interactive p-4">
                      <p className="text-slate-400">Calendar</p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {googleStatus.calendar_summary || googleStatus.calendar_id || "Primary"}
                      </p>
                      <p className="mt-2 text-slate-400">
                        Timezone: {googleStatus.calendar_timezone || "Not available"}
                      </p>
                      <p className="mt-2 text-slate-400">
                        Last sync: {formatDateTime(googleStatus.last_synced_at)}
                      </p>
                    </div>

                    <div className="panel-interactive p-4 text-slate-400">
                      <p className="font-medium text-white">Two-way sync behavior</p>
                      <p className="mt-2">
                        The app now pulls new and edited Google Calendar events into your task list, then pushes task changes back to Google.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleGoogleSync}
                        disabled={googleAction !== ""}
                        className="btn-primary"
                      >
                        <RefreshCw className="h-4 w-4" />
                        {googleAction === "sync" ? "Syncing..." : "Run Two-Way Sync"}
                      </button>

                      <button
                        type="button"
                        onClick={handleGoogleDisconnect}
                        disabled={googleAction !== ""}
                        className="btn-secondary"
                      >
                        <Unplug className="h-4 w-4" />
                        {googleAction === "disconnect" ? "Disconnecting..." : "Disconnect"}
                      </button>

                      <a
                        href="https://calendar.google.com/calendar/u/0/r"
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open Google Calendar
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={handleGoogleConnect}
                      disabled={googleAction !== ""}
                      className="btn-primary"
                    >
                      <Link2 className="h-4 w-4" />
                      {googleAction === "connect"
                        ? "Opening Google..."
                        : "Connect Google Calendar"}
                    </button>

                    <div className="panel-interactive p-4 text-slate-400">
                      <p className="font-medium text-white">Required backend variables</p>
                      <p className="mt-2">
                        {googleStatus.missing_settings?.length
                          ? googleStatus.missing_settings.join(", ")
                          : "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALENDAR_REDIRECT_URI"}
                      </p>
                      <p className="mt-3">
                        Tip: use a dedicated Google calendar instead of `primary` if you only want project tasks imported into this app.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="panel p-6">
          <h3 className="section-title">Workspace Preferences</h3>
          <p className="mt-1 text-sm text-slate-400">
            These settings are stored in your browser and shape the frontend experience.
          </p>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div>
              <label className="form-label" htmlFor="dashboardRange">
                Default analytics range
              </label>
              <select
                id="dashboardRange"
                name="dashboardRange"
                value={preferences.dashboardRange}
                onChange={handleChange}
                className="form-input"
              >
                {[7, 14, 30, 90].map((value) => (
                  <option key={value} value={value}>
                    Last {value} days
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" htmlFor="defaultTaskTab">
                Default task tab
              </label>
              <select
                id="defaultTaskTab"
                name="defaultTaskTab"
                value={preferences.defaultTaskTab}
                onChange={handleChange}
                className="form-input"
              >
                {taskTabs.map((tab) => (
                  <option key={tab.value} value={tab.value}>
                    {tab.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" htmlFor="defaultPageSize">
                Default page size
              </label>
              <select
                id="defaultPageSize"
                name="defaultPageSize"
                value={preferences.defaultPageSize}
                onChange={handleChange}
                className="form-input"
              >
                {[5, 10, 20, 30].map((value) => (
                  <option key={value} value={value}>
                    {value} tasks per page
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 grid gap-4">
            {[
              {
                name: "compactRows",
                label: "Compact task table rows",
                description: "Tighten row spacing to fit more tasks on screen.",
              },
              {
                name: "emailDigest",
                label: "Daily planning mindset",
                description: "Keep the interface optimized for a daily review habit.",
              },
              {
                name: "showActivityFeed",
                label: "Show activity feed emphasis",
                description: "Prioritize recent task activity in analytics-heavy views.",
              },
            ].map((toggle) => (
              <label
                key={toggle.name}
                className="panel-interactive flex cursor-pointer items-start justify-between gap-4 p-4"
              >
                <div>
                  <p className="font-medium text-zinc-950">{toggle.label}</p>
                  <p className="mt-1 text-sm text-zinc-500">{toggle.description}</p>
                </div>
                <div className="relative mt-1">
                  <input
                    type="checkbox"
                    name={toggle.name}
                    checked={preferences[toggle.name]}
                    onChange={handleChange}
                    className="peer sr-only"
                  />
                  <div className="h-7 w-12 rounded-full border border-black/10 bg-black/[0.08] transition peer-checked:bg-zinc-950" />
                  <div className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
                </div>
              </label>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
