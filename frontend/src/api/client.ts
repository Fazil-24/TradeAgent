import axios from "axios";

// A hardcoded "localhost:8000" would break the app the moment it's opened
// from a phone — "localhost" on a phone means the phone itself, not the
// dev machine. Default to whatever host the page itself was loaded from
// (works for localhost, 127.0.0.1, and a LAN IP alike); VITE_API_URL can
// still override this for a separately-hosted API.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`;

const client = axios.create({
  baseURL: API_BASE_URL,
  // A safety net so a request never hangs forever (e.g. backend not
  // running) — AI generation can legitimately take a while, so this is
  // generous rather than tight.
  timeout: 30000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("tradeagent_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("tradeagent_token");
      localStorage.removeItem("tradeagent_user");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "The request timed out. Please try again.";
    }
    if (!error.response) {
      return `Cannot reach the server at ${API_BASE_URL}. Is the backend running?`;
    }
    return error.response?.data?.detail || error.message || "Something went wrong";
  }
  return "Something went wrong";
}

export default client;
