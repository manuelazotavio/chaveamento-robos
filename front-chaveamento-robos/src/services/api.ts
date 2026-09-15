import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export const TOKEN_STORAGE_KEY = "chaveamento.token";

// imagens/audios dos times: hoje o backend devolve URL completa do Supabase Storage;
// o `?? ""` cobre times antigos com path relativo (era servido pelo backend antes da migração)
export function resolveArquivoUrl(caminho: string | null | undefined): string {
  if (!caminho) return "";
  return caminho.startsWith("http") ? caminho : `${API_BASE_URL}${caminho}`;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes("/auth/login")) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    return Promise.reject(error);
  }
);
