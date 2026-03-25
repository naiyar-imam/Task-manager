import apiClient from "./client";

export async function fetchGoogleCalendarStatus() {
  const response = await apiClient.get("/integrations/google/status/");
  return response.data;
}

export async function beginGoogleCalendarAuthorization() {
  const response = await apiClient.get("/integrations/google/authorize/");
  return response.data;
}

export async function syncGoogleCalendarTasks() {
  const response = await apiClient.post("/integrations/google/sync/");
  return response.data;
}

export async function disconnectGoogleCalendar() {
  await apiClient.delete("/integrations/google/disconnect/");
}
