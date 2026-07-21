import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, refreshAccessToken } from './session-store';

type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean };

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const isAuthRoute = config?.url?.includes('/auth/') ?? false;
    if (error.response?.status !== 401 || !config || config._retried || isAuthRoute) {
      return Promise.reject(error);
    }
    config._retried = true;
    const session = await refreshAccessToken();
    config.headers.Authorization = `Bearer ${session.accessToken}`;
    return api(config);
  },
);

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: { message?: string } }>(error)) {
    return error.response?.data.error?.message ?? 'Não foi possível concluir a operação.';
  }
  return 'Não foi possível concluir a operação.';
}
