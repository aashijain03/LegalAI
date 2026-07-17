const DEFAULT_API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:3001"
  : "https://legalai-backend-v4t2.onrender.com";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  DEFAULT_API_BASE_URL;