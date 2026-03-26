import axios from "axios";

export const API_BASE_URL = "/api";

const STORAGE_KEY = "task-dashboard-auth";

export function getStoredAuth() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function setStoredAuth(payload) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearStoredAuth() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("auth:logout"));
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise = null;

apiClient.interceptors.request.use((config) => {
  const auth = getStoredAuth();

  if (auth?.access) {
    config.headers.Authorization = `Bearer ${auth.access}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const auth = getStoredAuth();

    if (
      error.response?.status === 401 &&
      auth?.refresh &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${API_BASE_URL}/auth/refresh/`, { refresh: auth.refresh })
          .then((response) => {
            const nextAuth = { ...auth, access: response.data.access };
            setStoredAuth(nextAuth);
            return response.data.access;
          })
          .catch((refreshError) => {
            clearStoredAuth();
            throw refreshError;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newAccessToken = await refreshPromise;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
