import { useSyncExternalStore } from "react";

export const THEME_KEY = "claudescape:theme";
export const RECENT_KEY = "claudescape:recent";

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStore(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
  listeners.forEach((l) => l());
}

export const useStored = (key: string) => useSyncExternalStore(subscribe, () => read(key), () => null);

export const useTheme = () => (useStored(THEME_KEY) === "light" ? "light" : "dark");
