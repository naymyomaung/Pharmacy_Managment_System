import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5084/api',
  headers: { 'Content-Type': 'application/json' },
});

export const unwrap = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data);
