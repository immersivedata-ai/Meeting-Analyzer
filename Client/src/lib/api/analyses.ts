import { apiFetch } from './client';
import type { AnalysisResults } from '@/types/analysis';

export interface AnalysisSummary {
  id: string;
  filename: string;
  created_at: string;
  action_items_count: number;
  decisions_count: number;
  word_count: number;
  duration_seconds: number;
  processing_time: number;
}

export interface AnalysisHistoryResponse {
  analyses: AnalysisSummary[];
  total: number;
}

// Extended type for the detail response (includes AnalysisResults fields + metadata)
export interface AnalysisDetail extends AnalysisResults {
  id: string;
  session_id: string;
  filename: string;
  created_at: string;
  duration: number;
  word_count: number;
}

export async function fetchAnalyses(
  limit = 50,
  skip = 0
): Promise<AnalysisHistoryResponse> {
  return apiFetch<AnalysisHistoryResponse>(
    `/analyses?limit=${limit}&skip=${skip}`
  );
}

export async function deleteAnalysis(id: string): Promise<void> {
  await apiFetch(`/analyses/${id}`, { method: 'DELETE' });
}

export async function fetchAnalysisDetail(id: string): Promise<AnalysisDetail> {
  return apiFetch<AnalysisDetail>(`/analyses/${id}`);
}
