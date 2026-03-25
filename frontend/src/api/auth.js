import apiClient from "./client";

export async function loginUser(payload) {
  const response = await apiClient.post("/auth/login/", payload);
  return response.data;
}

export async function registerUser(payload) {
  const response = await apiClient.post("/auth/register/", payload);
  return response.data;
}

export async function fetchCurrentUser() {
  const response = await apiClient.get("/auth/me/");
  return response.data;
}
