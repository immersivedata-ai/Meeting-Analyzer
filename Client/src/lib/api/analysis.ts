import { API_BASE } from './client'
import type { AnalysisResults } from '@/types/analysis'

const CHUNK_SIZE = 2 * 1024 * 1024  // 2 MB

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
  if (file.size <= 25 * 1024 * 1024) {
    return analyzeDirect(file, signal, onProgress)
  }
  return analyzeChunked(file, signal, onProgress)
}

async function analyzeDirect(
  file: File,
  signal?: AbortSignal,
  onProgress?: (percent: number, step: string, message: string) => void,
): Promise<AnalysisResults> {
  const formData = new FormData()
  formData.append('file', file)
  return streamAnalysis(`${API_BASE}/analyze/stream`, formData, signal, onProgress)
}

async function analyzeChunked(
  file: File,
  signal?: AbortSignal,
  onProgress?: (percent: number, step: string, message: string) => void,
): Promise<AnalysisResults> {
  const uploadId = crypto.randomUUID()
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

  onProgress?.(5, 'uploading', `Uploading in ${totalChunks} chunks...`)

  let completed = 0
  const uploadChunk = async (index: number): Promise<void> => {
    const start = index * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const blob = file.slice(start, end)

    const fd = new FormData()
    fd.append('upload_id', uploadId)
    fd.append('chunk_index', String(index))
    fd.append('total_chunks', String(totalChunks))
    fd.append('original_filename', file.name)
    fd.append('chunk', blob)

    const res = await fetch(`${API_BASE}/upload/chunk`, {
      method: 'POST',
      credentials: 'include',
      body: fd,
      signal,
    })
    if (!res.ok) throw new Error(`Chunk ${index} failed`)
    completed++
    if (totalChunks > 1) {
      onProgress?.(5 + Math.round((completed / totalChunks) * 10), 'uploading', `Uploading chunk ${completed}/${totalChunks}...`)
    }
  }

  const concurrencyLimit = 6
  const indices = Array.from({ length: totalChunks }, (_, i) => i)
  const results: Promise<void>[] = []
  for (const i of indices) {
    const p = uploadChunk(i).then(() => {
      results.splice(results.indexOf(p), 1)
    })
    results.push(p)
    if (results.length >= concurrencyLimit) {
      await Promise.race(results)
    }
  }
  await Promise.all(results)

  const formData = new FormData()
  formData.append('upload_id', uploadId)
  formData.append('original_filename', file.name)
  return streamAnalysis(`${API_BASE}/analyze/stream`, formData, signal, onProgress)
}

async function streamAnalysis(
  url: string,
  formData: FormData,
  signal?: AbortSignal,
  onProgress?: (percent: number, step: string, message: string) => void,
): Promise<AnalysisResults> {
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
