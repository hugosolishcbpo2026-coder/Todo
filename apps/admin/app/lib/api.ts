"use client";

import { TodoApiClient } from "@todo/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const TOKEN_KEY = "todo.admin.token";

/** Shared singleton client for the admin dashboard (browser only). */
export const api = new TodoApiClient(API_URL);

export function loadToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(TOKEN_KEY) ?? undefined;
}

export function saveToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  api.setToken(token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  api.setToken(undefined);
}

/** Rehydrate the client token from storage (called on app load). */
export function bootstrapAuth(): boolean {
  const token = loadToken();
  if (token) api.setToken(token);
  return Boolean(token);
}
