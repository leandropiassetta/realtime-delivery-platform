import axios from 'axios';
import type { ApiResponse, SessionData } from '../types';

const apiUrl = import.meta.env.VITE_API_URL ?? '/api/v1';
const sessionClient = axios.create({ baseURL: apiUrl, withCredentials: true });

let accessToken: string | null = null;
let refreshPromise: Promise<SessionData> | null = null;
let listener: ((session: SessionData | null) => void) | null = null;

export const getAccessToken = () => accessToken;

export function setSession(session: SessionData | null) {
  accessToken = session?.accessToken ?? null;
  listener?.(session);
}

export function observeSession(nextListener: (session: SessionData | null) => void) {
  listener = nextListener;
  return () => {
    if (listener === nextListener) listener = null;
  };
}

export function refreshAccessToken(): Promise<SessionData> {
  refreshPromise ??= sessionClient
    .post<ApiResponse<SessionData>>('/auth/refresh')
    .then((response) => {
      setSession(response.data.data);
      return response.data.data;
    })
    .catch((error: unknown) => {
      setSession(null);
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}
