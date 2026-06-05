import { apiFetch } from './client'
import type { AnalysisResults } from '@/types/analysis'

interface BackendAnalysisResponse {
  transcript: AnalysisResults['transcript']
  summary: string
  action_items: AnalysisResults['action_items']
  key_decisions: AnalysisResults['key_decisions']
  processing_time: number
}

function transformResponse(data: BackendAnalysisResponse): AnalysisResults {
  return {
    transcript: data.transcript || [],
    summary: data.summary || '',
    action_items: data.action_items || [],
    key_decisions: data.key_decisions || [],
    processing_time: data.processing_time || 0,
  }
}

export async function analyzeFile(file: File): Promise<AnalysisResults> {
  const formData = new FormData()
  formData.append('file', file)

  const data = await apiFetch<BackendAnalysisResponse>('/analyze', {
    method: 'POST',
    body: formData,
  })

  return transformResponse(data)
}

export async function getSupportedFormats() {
  return apiFetch('/formats')
}

export async function getServiceStatus() {
  return apiFetch('/status')
}
