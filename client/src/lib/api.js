import axios from "axios";
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "", timeout: 15_000, withCredentials: true, headers: { Accept: "application/json" } });
api.interceptors.request.use((config) => {
  return config;
});
api.interceptors.response.use((response) => response, (error) => Promise.reject(new Error(error.response?.data?.error || error.message || "Request failed")));
