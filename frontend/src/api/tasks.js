import apiClient from "./client";

export async function fetchTasks(params = {}) {
  const response = await apiClient.get("/tasks/", { params });
  return response.data;
}

export async function createTask(payload) {
  const response = await apiClient.post("/tasks/", payload);
  return response.data;
}

export async function updateTask(taskId, payload) {
  const response = await apiClient.put(`/tasks/${taskId}/`, payload);
  return response.data;
}

export async function deleteTask(taskId) {
  await apiClient.delete(`/tasks/${taskId}/`);
}

export async function fetchStats() {
  const response = await apiClient.get("/stats/");
  return response.data;
}

export async function fetchAnalytics(params = {}) {
  const response = await apiClient.get("/analytics/", { params });
  return response.data;
}
