import axios from "axios";
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  timeout: 15_000,
  withCredentials: true,
  headers: { Accept: "application/json" },
});
api.interceptors.request.use((config) => {
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = new Error(
      error.response?.status === 429
        ? "You're doing that a bit fast — try again in a moment"
        : error.response?.data?.error || error.message || "Request failed",
    );
    normalized.status = error.response?.status;
    normalized.retryAfter = error.response?.data?.retryAfter;
    return Promise.reject(normalized);
  },
);
