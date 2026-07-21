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
  // Default timeout for normal requests. AI endpoints override this
  // per-request because photo analysis with Gemini can take 60-90s.
  timeout: 30000,
});

// Use this for AI endpoints (analyze, recommendations) which are slow.
export const aiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes — Gemini vision can take 60-90s on large photos
});

function addInterceptors(instance: ReturnType<typeof axios.create>) {
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem("tradeagent_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  instance.interceptors.response.use(
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
}

addInterceptors(client);
addInterceptors(aiClient);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "The AI is taking longer than expected. Please try again — it usually completes within 60 seconds.";
    }
    if (!error.response) {
      return `Cannot reach the server at ${API_BASE_URL}. Is the backend running?`;
    }
    return error.response?.data?.detail || error.message || "Something went wrong";
  }
  return "Something went wrong";
}

export default client;
