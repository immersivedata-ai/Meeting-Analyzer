import { API_BASE } from './client'
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

export async function analyzeFile(
  file: File,
  signal?: AbortSignal,
  onProgress?: (percent: number, step: string, message: string) => void,
): Promise<AnalysisResults> {
  const formData = new FormData()
  formData.append('file', file)

  const url = `${API_BASE}/analyze/stream`
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || err.message || `Request failed (${res.status})`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const event = JSON.parse(line)
        if (event.status === 'progress') {
          onProgress?.(event.percent, event.step, event.message)
        } else if (event.status === 'complete') {
          return transformResponse(event)
        } else if (event.status === 'error') {
          throw new Error(event.message)
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }

  throw new Error('Stream ended without completion')
}

export async function getSupportedFormats() {
  const { apiFetch } = await import('./client')
  return apiFetch('/formats')
}

export async function getServiceStatus() {
  const { apiFetch } = await import('./client')
  return apiFetch('/status')
}

export async function translateText(text: string, targetLang: 'hi' | 'en'): Promise<string> {
  const { apiFetch } = await import('./client')
  const data = await apiFetch<{ translated: string }>('/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, target_lang: targetLang }),
  })
  return data.translated
}
