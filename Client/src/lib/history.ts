import type { AnalysisResults } from '@/types/analysis';

export interface HistoryEntry {
  id: string;
  filename: string;
  createdAt: number;
  results: AnalysisResults;
}

const STORAGE_KEY = 'manthan_history';

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function addToHistory(filename: string, results: AnalysisResults): HistoryEntry {
  const history = getHistory();
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    filename,
    createdAt: Date.now(),
    results,
  };
  history.unshift(entry);
  // Keep only the last 50 entries
  if (history.length > 50) {
    history.splice(50);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return entry;
}

export function deleteFromHistory(id: string): void {
  const history = getHistory().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
